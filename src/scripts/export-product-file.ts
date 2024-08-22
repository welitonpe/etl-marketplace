import { z } from "zod";

import { exportProductFileSchema } from "../schemas/zod";
import { logger } from "../utils/logger";
import { paths } from "../utils/paths";
import { Product } from "../types";
import api from "../services/api";

class ExportProductFile {
    env: z.infer<typeof exportProductFileSchema>;
    processedProducts = 0;
    products: Product[] = [];

    constructor() {
        this.env = exportProductFileSchema.parse(import.meta.env);
    }

    async run(page = 1, pageSize = 200) {
        const response = await api.getDeliveryProducts(
            this.env.CHANNEL_ID as string,
            page,
            pageSize
        );

        const { items: products, ...productResponse } = await response.json<{
            page: number;
            lastPage: number;
            items: Required<Product>[];
        }>();

        logger.info(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        products.forEach(({ customFields: _customFields, ...product }) => {
            this.products.push({
                ...product,
                images: product.images.map(
                    ({ customFields, ...image }: any) => image
                ),
            });
        });

        if (productResponse.page === productResponse.lastPage) {
            logger.info("Finished, saving the file products.json");

            return Bun.write(
                `${paths.json}/products.json`,
                JSON.stringify(this.products)
            );
        }

        await this.run(page + 1, pageSize);
    }
}

logger.info("Starting");

const exportProductFile = new ExportProductFile();

await exportProductFile.run();
