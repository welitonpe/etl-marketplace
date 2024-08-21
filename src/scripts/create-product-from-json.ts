import {
	createProductFromJSONchema,
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
	Product,
	ProductSpecification,
	Vocabulary,
} from "../types";
import { z } from "zod";

const env: z.infer<typeof migrateProductVersionSchema> =
	migrateProductVersionSchema.parse(ENV);

const SITE_ID = env.SITE_ID;

class CreateProductFromCSV {
	private logger = logger;

	constructor(
		private catalogs: Catalog[],
		private specifications: ProductSpecification[],
		private vocabularies: Vocabulary[],
	) {
		createProductFromJSONchema.parse(ENV);
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

	async createProduct(product: Product) {
		return await api.postProduct(product);
	}

	async createCatalog(product: Product) {
		const catalogFiltered =
			this.catalogs?.filter(
				(catalog: Catalog) => catalog.name === product.catalogName,
			) || [];

		if (catalogFiltered[0]?.id) {
			return catalogFiltered[0];
		}

		const createCatalogResponse = await api.createCatalog({
			name: product.catalogName,
			currencyCode: "USD",
			defaultLanguageId: "en_US",
		});

		return createCatalogResponse;
	}

	async run() {
		this.logger = logger.child(logger.bindings(), {
			msgPrefix: `Start Proccess `,
		});

		const productsRawJSON = await Bun.file(`${paths.csv}/products.json`).text();
		const jsonProducts = JSON.parse(productsRawJSON);

		let catalog;
		let categoriesList: any[] = [];
		let productSpecificationsList: ProductSpecification[] = [];

		for (const [index, product] of jsonProducts.entries()) {
			logger.info(`${index} Product ${product.name}`);

			const productCategories = product?.categories;
			const productSpecifications = product.productSpecifications;

			try {
				const getProductResponse = await api.getProductByERC(
					product.externalReferenceCode,
				);

				if (getProductResponse.ok) {
					logger.info(`\tProduct ${product.name} Already Created`);
				}
			} catch (error) {
				// VERIFY/CREATE CATALOG
				catalog = await this.createCatalog(product);

				// VERIFY CATEGORIES
				for (const category of productCategories) {
					const vocabulary = this.vocabularies?.filter(
						(vocabulary) =>
							category.vocabulary.replaceAll("tag", "tags") ===
								vocabulary.name
									.replaceAll(" ", "-")
									.replaceAll("tag", "tags")
									.toLowerCase() || category.vocabulary === vocabulary.name,
					);

					if (vocabulary.length) {
						const { items: categoryList } = await api.getCategories(
							vocabulary[0]?.id,
						);

						const filteredCategory = categoryList?.filter(
							(categoryResponse) => category.name === categoryResponse.name,
						);

						if (filteredCategory?.length) {
							delete category.title;
							categoriesList.push({
								...category,
								id: filteredCategory[0]?.id,
								siteId: ENV.SITE_ID,
								title: { en_US: filteredCategory[0].name },
							});
						}
					}
				}

				// FILTER SPECIFICATIONS
				for (const specification of productSpecifications) {
					const filteredSpecification = this.specifications?.filter(
						(spc) => specification.specificationKey === spc.key,
					);

					if (
						filteredSpecification?.length &&
						filteredSpecification[0]?.key !== "liferay-version"
					) {
						productSpecificationsList.push({
							id: filteredSpecification[0]?.id,
							specificationKey: filteredSpecification[0]?.key as string,
							value: {
								en_US: await this.getVersionNumber(specification.value),
							},
						});
					}
				}

				await this.createProduct({
					active: true,
					catalogId: catalog.id,
					productSpecifications: productSpecificationsList,
					categories: categoriesList,
					description: {
						en_US: product.description,
					},
					externalReferenceCode: product.externalReferenceCode,
					name: {
						en_US: product.name,
					},
					productType: "virtual",
				}).catch((error) =>
					logger.error(`${index} - Failed to create ${product.name}` + error),
				);

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

				logger.info(`${index} - Created product ${product.name}`);

				categoriesList = [];
				productSpecificationsList = [];
			}
		}
	}
}

const [catalogsResponse, specificationResponse, vocabulariesResponse] =
	await Promise.all([
		api.getCatalogSearch(),
		api.getSpecification(),
		api.getTaxonomyVocabularies(SITE_ID),
	]);

const { items: catalogs } = await catalogsResponse.json<APIResponse>();
const { items: specifications } = specificationResponse;
const { items: vocabularies } = await vocabulariesResponse.json<APIResponse>();

const createProductFromCSV = new CreateProductFromCSV(
	catalogs,
	specifications,
	vocabularies,
);

await createProductFromCSV.run();
