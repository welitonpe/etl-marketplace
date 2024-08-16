import {
	createProductFromCSVSchema,
	liferayAuthSchema,
	migrateProductVersionSchema,
} from "../schemas/zod";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";
import { paths } from "../utils/paths";
import api from "../services/api";
import {
	APIResponse,
	Catalog,
	ProductSpecifications,
	Vocabulary,
} from "../types";
import { z } from "zod";

const env: z.infer<typeof migrateProductVersionSchema> =
	migrateProductVersionSchema.parse(ENV);

const SITE_ID = env.SITE_ID;

class CreateProductFromCSV {
	constructor(
		private vocabularies: Vocabulary[],
		private catalogs: Catalog[],
		private specifications: ProductSpecifications[],
	) {
		createProductFromCSVSchema.parse(ENV);

		if (liferayAuthSchema.parse(ENV).LIFERAY_HOST.startsWith("https")) {
			throw new Error(
				"This script is only allowed to be executed for localhost environment",
			);
		}
	}

	async getImageAsBase64(url: string) {
		const response = await fetch(url);
		const buffer = await response.arrayBuffer();

		const base64Image = Buffer.from(buffer).toString("base64");

		return base64Image;
	}
	async getVersionNumber(fileName: string) {
		const version = fileName.match(/\d+\.\d+/);

		return version ? version[0] : fileName;
	}

	async run() {
		const productsRawJSON = await Bun.file(`${paths.csv}/products.json`).text();
		const jsonProducts = JSON.parse(productsRawJSON);

		let catalogId;

		let finalCategories = [];

		for (const [index, product] of jsonProducts.entries()) {
			const productSpecifications = product.productSpecifications;

			const productCategories = product?.categories;

			for (const category of productCategories) {
				const [vocabulary] = this.vocabularies?.filter(
					(vocabulary) =>
						category.vocabulary ===
						vocabulary.name.replaceAll(" ", "-").toLowerCase(),
				);

				if (vocabulary?.id) {
					const { items: categoryList } = await api.getCategories(
						vocabulary.id,
					);

					const filteredCategory = categoryList?.filter(
						(categoryResponse) => category.name === categoryResponse.name,
					);

					if (filteredCategory?.length) {
						delete category.title;

						finalCategories.push({
							...category,
							id: filteredCategory[0]?.id,
							siteId: ENV.SITE_ID,
							title: { en_US: filteredCategory[0].title },
						});
					}
				}
			}

			const catalog =
				this.catalogs?.filter(
					(catalog: Catalog) => catalog.name === product.catalogName,
				) || [];

			catalogId = catalog[0]?.id || "";

			if (!catalogId) {
				const catalog = {
					name: product.catalogName,
					currencyCode: "USD",
					defaultLanguageId: "en_US",
				};

				const createCatalogResponse = await api.createCatalog(catalog);

				catalogId = createCatalogResponse;
			}

			const buildProduct = {
				active: true,
				catalogId: ENV.CATALOG_ID,
				categories: finalCategories,
				description: { en_US: product.description },
				externalReferenceCode: product.externalReferenceCode,
				name: { en_US: product.name },
				productType: "virtual",
			};

			const createProductResponse = await api
				.postProduct(buildProduct)
				.catch((error) =>
					logger.error(`${index} - Failed to create ${product.name}` + error),
				);
		}

		for (const image of product.images) {
			await api.createImage(
				{
					attachment: await this.getImageAsBase64(image.src),
					galleryEnabled: image.galleryEnabled,
					neverExpire: true,
					priority: image.priority,
					tags: image.tags || [],
					title: { en_US: image.title },
				},
				product.externalReferenceCode,
			);
		}

		for (const attachemnt of product.attachments) {
			await api.createAttachment(
				{
					attachment: await this.getImageAsBase64(attachemnt.src),
					galleryEnabled: attachemnt.galleryEnabled,
					neverExpire: true,
					priority: attachemnt.priority,
					tags: attachemnt.tags || [],
					title: { en_US: attachemnt.title },
				},
				product.externalReferenceCode,
			);
		}

		if (createProductResponse?.producId) {
			for (const specification of productSpecifications) {
				const filteredSpecification = this.specifications?.filter(
					(spc) => specification.specificationKey === spc.key,
				);

				if (
					filteredSpecification.length &&
					filteredSpecification.key !== "liferay-version"
				) {
					await api.createProductSpecification(
						createProductResponse.productId,
						{
							id: filteredSpecification[0]?.id,
							specificationKey: filteredSpecification[0]?.key,
							value: {
								en_US: this.getVersionNumber(specification.value),
							},
						},
					);
				}
			}

			logger.info(`${index} - Created product ${product.name}`);

			finalCategories = [];
		}
	}
}

const [vocabulariesResponse, catalogsResponse, specificationResponse] =
	await Promise.all([
		api.getTaxonomyVocabularies(SITE_ID),
		api.getCatalogSearch(),
		api.getSpecification(),
	]);

const { items: vocabularies } = await vocabulariesResponse.json<APIResponse>();
const { items: catalogs } = await catalogsResponse.json<APIResponse>();
const { items: specifications } = await specificationResponse;

const createProductFromCSV = new CreateProductFromCSV(
	vocabularies,
	catalogs,
	specifications,
);

await createProductFromCSV.run();
