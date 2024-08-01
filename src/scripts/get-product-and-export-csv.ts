import api from "../services/api";
import { Product } from "../types";
import { paths } from "../utils/paths";

const ENV = import.meta.env;
const CSV_HEADER_TITLE = ["ERC", "ID", "PRODUCTNAME"];
const channelId = ENV.CHANNEL_ID;
const productList = [CSV_HEADER_TITLE];

class ProductDeliveryExport {
    processedProducts = 0;

    async run(page = 1, pageSize = 50) {
        const response = await api.getDeliveryProducts(
            channelId as string,
            page,
            pageSize
        );

        const { items: products, ...productResponse } = await response.json<{
            page: number;
            lastPage: number;
            items: Product[];
        }>();

        console.log(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        for (const product of products) {
            productList.push([
                `${product.externalReferenceCode},${product.id},${product.name}`,
            ]);

            const csvData = productList
                .map((row) => row.join(","))
                .join("\n")
                .replaceAll(",", ";");

            await Bun.write(`${paths.csv}/products.csv`, csvData);
        }

        if (productResponse.page === productResponse.lastPage) {
            console.log("Processed Products", this.processedProducts);
        } else {
            await this.run(page + 1, pageSize);
        }
    }
}

console.log("Starting:", new Date());

const productDeliveryExport = new ProductDeliveryExport();

productDeliveryExport.run();
