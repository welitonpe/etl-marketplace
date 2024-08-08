import { createProductFromCSVSchema } from "../schemas/zod";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";
import { paths } from "../utils/paths";
import api from "../services/api";

class CreateProductFromCSV {
    constructor() {
        createProductFromCSVSchema.parse(ENV);
    }

    async run() {
        const productsRaw = await Bun.file(`${paths.csv}/products.csv`).text();

        const products = [...productsRaw.split("\n")].map((product) => {
            const [erc, id, appName] = product.split(";");

            return {
                erc,
                id,
                appName,
            };
        });

        for (const [index, product] of products.entries()) {
            await api
                .postProduct({
                    active: true,
                    catalogId: ENV.CATALOG_ID,
                    externalReferenceCode: product.erc,
                    name: {
                        en_US: product.appName,
                    },
                    productType: "virtual",
                })
                .catch((error) =>
                    logger.error(
                        `${index} - Failed to create ${product.appName}`,
                        error
                    )
                );

            logger.info(`${index} - Created product ${product.appName}`);
        }
    }
}

const createProductFromCSV = new CreateProductFromCSV();

await createProductFromCSV.run();
