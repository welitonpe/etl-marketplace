import config from "../config";
import api from "../services/api";
import { Product } from "../types";
import { paths } from "../utils/paths";

const CSV_HEADER_TITLE = ['ERC', 'ID', 'PRODUCTNAME']
const MARKETPLACE_VOCABULARY = "marketplace product type"

class ProductSpecifications {
    processedProducts = 0;
    producList = [CSV_HEADER_TITLE]

    async processProductSKU(product: Product) {
        ++this.processedProducts;
    }

    async run(page = 1, pageSize = 50) {

        const response = await api.getProducts(page, pageSize);

        const { items: products, ...productResponse } = await response.json<{
            page: number;
            lastPage: number;
            items: Product[];
        }>();

        console.log(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        for (const product of products) {
            const productTypes = product.categories
                .filter(
                    ({ vocabulary }) =>
                        vocabulary === MARKETPLACE_VOCABULARY
                )
                .map(({ name }) => name);

            if (productTypes.length) {

                this.producList.push([`${product.externalReferenceCode},${product.id},${product.name.en_US}`])

                const csvData = this.producList.map(row => row.join(',')).join('\n').replaceAll(",", ";");

                await Bun.write(`${paths.csv}/producst_list.csv`, csvData);
            } else {
                console.warn(
                    "NO OK",
                    product.externalReferenceCode,
                    product.id,
                    product.name.en_US,
                    "-->",
                    productTypes.join(", ")
                );
            }
        }

        if (productResponse.page === productResponse.lastPage) {
            console.log("Processed Products", this.processedProducts);
        } else {
            await this.run(page + 1, pageSize);
        }
    }
}

console.log("Starting:", config.OAUTH_HOST, new Date());

const productSpecifications = new ProductSpecifications();

productSpecifications.run();
