import api from "../services/api";
import { APIResponse, Product } from "../types";
import { paths } from "../utils/paths";

const ENV = import.meta.env;
const CSV_HEADER_TITLE = ["ERC", "ID", "PRODUCTNAME"];
const channelId = ENV.CHANNEL_ID;
const productList = [CSV_HEADER_TITLE];

class ProductDeliveryExport {
	processedProducts = 0;
	productsListJSON: Product[] = [];

	async run(page = 1, pageSize = 50) {
		const response = await api.getDeliveryProducts(
			channelId as string,
			page,
			pageSize,
		);

		const { items: products, ...productResponse } = await response.json<{
			page: number;
			lastPage: number;
			items: Product[];
		}>();

		console.log(
			`Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`,
		);

		for (const product of products) {
			productList.push([
				`${product.externalReferenceCode},${product.id},${product.name}`,
			]);

			const [productAttachments, productImages] = await Promise.all([
				await api.getProductAttachments(
					ENV.CHANNEL_ID as string,
					product.id as unknown as string,
				),
				await api.getProductImages(
					ENV.CHANNEL_ID as string,
					product.id as unknown as string,
				),
			]);

			const { items: attachments } =
				await productAttachments.json<APIResponse>();
			const { items: images } = await productImages.json<APIResponse>();

			const csvData = productList
				.map((row) => row.join(","))
				.join("\n")
				.replaceAll(",", ";");

			await Bun.write(`${paths.csv}/products.csv`, csvData);

			delete product.customFields;

			this.productsListJSON.push({ ...product, attachments, images });
			this.productsListJSON.push(product);
		}

		if (productResponse.page === productResponse.lastPage) {
			await Bun.write(
				`${paths.csv}/products.json`,
				JSON.stringify(this.productsListJSON),
			);
		} else {
			await this.run(page + 1, pageSize);
		}
	}
}

// await api.getProductAttachments("18427291", "18603048");

console.log("Starting:", new Date());

const productDeliveryExport = new ProductDeliveryExport();

productDeliveryExport.run();
