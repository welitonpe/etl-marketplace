import {
	createProductFromJSONchema,
	liferayAuthSchema,
	migrateProductVersionSchema,
} from "../schemas/zod";
import { ENV } from "../config/env";
import { paths } from "../utils/paths";

import { z } from "zod";
import api from "../services/api";
import { APIResponse, Channel, Product } from "../types";
import SearchBuilder from "../core/SearchBuilder";

const env: z.infer<typeof migrateProductVersionSchema> =
	migrateProductVersionSchema.parse(ENV);

const SITE_ID = env.SITE_ID;
const SPECIFIC_PRODUCT_TO_TEST = "Liferay Commerce Connector to Stripe";
const MARKETPLACE_CHANNEL = "Marketplace Channel";

class CreateProductFromCSV {
	constructor() {
		createProductFromJSONchema.parse(ENV);

		if (liferayAuthSchema.parse(ENV).LIFERAY_HOST.startsWith("https")) {
			throw new Error(
				"This script is only allowed to be executed for localhost environment",
			);
		}
	}

	async readJSONfile(filePath: string) {
		const productsRawJSON = await Bun.file(filePath).text();
		return JSON.parse(productsRawJSON);
	}

	async run() {
		const exportedProducts = await this.readJSONfile(
			`${paths.csv}/products.json`,
		);

		const selectedProduct = exportedProducts.filter(
			(product: Product) => product.name === SPECIFIC_PRODUCT_TO_TEST,
		);

		for (const jsonProduct of selectedProduct) {
			const hasProduct = await api.getProductByERC(
				jsonProduct.externalReferenceCode,
			);
		}
	}
}

const [channelResponse, vocabulariesResponse] = await Promise.all([
	api.getChannelSearch(
		new URLSearchParams({
			filter: SearchBuilder.eq("name", MARKETPLACE_CHANNEL),
		}),
	),
	api.getTaxonomyVocabularies(SITE_ID),
]);

const marketplaceChannel = await channelResponse.json<APIResponse<Channel>>();
const vocabularies = await vocabulariesResponse.json<APIResponse>();

const createProductFromCSV = new CreateProductFromCSV();
await createProductFromCSV.run();
