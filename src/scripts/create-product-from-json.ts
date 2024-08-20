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
import ora from "ora";
import { logger } from "../utils/logger";

const env: z.infer<typeof migrateProductVersionSchema> =
	migrateProductVersionSchema.parse(ENV);

const SITE_ID = env.SITE_ID;

const spinner = ora("Loading unicorns").start();
class CreateProductFromCSV {
	private logger = logger;

	constructor(
		private vocabularies: Vocabulary[],
		private catalogs: Catalog[],
		private specifications: ProductSpecifications[],
		private options: any[],
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
		this.logger = logger.child(logger.bindings(), {
			msgPrefix: `Start Proccess `,
		});

		const productsRawJSON = await Bun.file(`${paths.csv}/products.json`).text();
		const jsonProducts = JSON.parse(productsRawJSON);

		let catalogId;
		let existentProcduct;
		let categoryList: any[] = [];
		let productSpecificationsBuild = [];
		let skus: any[] = [];

		for (const [index, product] of jsonProducts.entries()) {
			this.logger.info("");

			spinner.text = `${index} - Created product ${product.name}`;

			try {
				const getProductResposne = await api.getProductByERC(
					product.externalReferenceCode,
				);

				existentProcduct = getProductResposne.json();
			} catch (errror) {}

			if (existentProcduct) {
				console.log(existentProcduct);
			}

			// if (index === 5) {
			// const productSKUS = product.skus;
			// for (const sku of productSKUS) {
			// 	for (const skuOption of sku?.skuOptions) {
			// 		const filteredOptions = this.options.filter(
			// 			(option) => option.key === skuOption.skuOptionKey,
			// 		);

			// 		if (filteredOptions?.length) {
			// 			const { items: optionvalue } = await api.getOptionValues(
			// 				filteredOptions[0].id,
			// 			);

			// 			const [correctOption] = optionvalue.filter(
			// 				(option) => option.key === skuOption.skuOptionValueKey,
			// 			);

			// 			skus.push({
			// 				cost: sku.price.price,
			// 				depth: sku.depth,
			// 				discontinued: sku.discontinued,
			// 				displayDate: sku.displayDate,
			// 				externalReferenceCode: sku.externalReferenceCode,
			// 				gtin: sku.gtin,
			// 				manufacturerPartNumber: sku.manufacturerPartNumber,
			// 				price: sku.price,
			// 				published: sku.published,
			// 				purchasable: sku.published,
			// 				skuOptions: [
			// 					{
			// 						key: filteredOptions[0].key,
			// 						optionId: filteredOptions[0].id,
			// 						optionValueId: correctOption?.id,
			// 						value: correctOption.key,
			// 					},
			// 				],
			// 			});
			// 		}
			// 	}
			// }

			// const productSpecifications = product.productSpecifications;
			// const productCategories = product?.categories;
			// const catalog =
			// 	this.catalogs?.filter(
			// 		(catalog: Catalog) => catalog.name === product.catalogName,
			// 	) || [];
			// catalogId = catalog[0]?.id || "";

			// if (!catalogId) {
			// 	const catalog = {
			// 		name: product.catalogName,
			// 		currencyCode: "USD",
			// 		defaultLanguageId: "en_US",
			// 	};
			// 	const createCatalogResponse = await api.createCatalog(catalog);
			// 	catalogId = createCatalogResponse;
			// }

			// for (const category of productCategories) {
			// 	const [vocabulary] = this.vocabularies?.filter(
			// 		(vocabulary) =>
			// 			category.vocabulary.replaceAll("tag", "tags") ===
			// 				vocabulary.name
			// 					.replaceAll(" ", "-")
			// 					.replaceAll("tag", "tags")
			// 					.toLowerCase() || category.vocabulary === vocabulary.name,
			// 	);

			// 	if (vocabulary?.id) {
			// 		const { items: categoryList } = await api.getCategories(
			// 			vocabulary.id,
			// 		);
			// 		const filteredCategory = categoryList?.filter(
			// 			(categoryResponse) => category.name === categoryResponse.name,
			// 		);
			// 		if (filteredCategory?.length) {
			// 			delete category.title;
			// 			categoryList.push({
			// 				...category,
			// 				id: filteredCategory[0]?.id,
			// 				siteId: ENV.SITE_ID,
			// 				title: { en_US: filteredCategory[0].title },
			// 			});
			// 		}
			// 	}
			// }

			// for (const specification of productSpecifications) {
			// 	const filteredSpecification = this.specifications?.filter(
			// 		(spc) => specification.specificationKey === spc.key,
			// 	);
			// 	if (
			// 		filteredSpecification?.length &&
			// 		filteredSpecification[0]?.key !== "liferay-version"
			// 	) {
			// 		productSpecificationsBuild.push({
			// 			id: filteredSpecification[0]?.id,
			// 			specificationKey: filteredSpecification[0]?.key,
			// 			value: {
			// 				en_US: await this.getVersionNumber(specification.value),
			// 			},
			// 		});
			// 	}
			// }

			// const buildProduct = {
			// 	active: true,
			// 	catalogId,
			// skus: skus,
			// // productOptions: [
			// // 	{
			// // 		facetable: false,
			// // 		fieldType: "radio",
			// // 		key: "dxp-license-usage-type",
			// // 		name: { en_US: "DXP License Usage Type" },
			// // 		optionId: 35379,
			// // 		productOptionValues: [
			// // 			{
			// // 				key: "standard",
			// // 				name: { en_US: "Standard" },
			// // 				en_US: "Standard",
			// // 				priority: 0,
			// // 			},
			// // 			{
			// // 				key: "developer",
			// // 				name: { en_US: "Developer" },
			// // 				priority: 1,
			// // 			},
			// // 			{
			// // 				key: "trial",
			// // 				name: { en_US: "Trial" },
			// // 				priority: 2,
			// // 			},
			// // 		],
			// // 		required: true,
			// // 		skuContributor: true,
			// // 	},
			// // ],
			// 	productSpecifications: productSpecificationsBuild,
			// 	categories: categoryList,
			// 	description: { en_US: product.description },
			// 	externalReferenceCode: product.externalReferenceCode,
			// 	name: { en_US: product.name },
			// 	productType: "virtual",
			// };

			// await api
			// 	.postProduct(buildProduct)
			// 	.catch((error) =>
			// 		logger.error(`${index} - Failed to create ${product.name}` + error),
			// 	);

			// for (const image of product.images) {
			// 	await api.createImage(
			// 		{
			// 			attachment: await this.getImageAsBase64(image.src),
			// 			galleryEnabled: image.galleryEnabled,
			// 			neverExpire: true,
			// 			priority: image.priority,
			// 			tags: image.tags || [],
			// 			title: { en_US: image.title },
			// 		},
			// 		product.externalReferenceCode,
			// 	);
			// }

			// logger.info(`${index} - Created product ${product.name}`);

			// categoryList = [];
			// skus = [];
			// }
		}
	}
}

const [
	vocabulariesResponse,
	catalogsResponse,
	specificationResponse,
	optionsResponse,
] = await Promise.all([
	api.getTaxonomyVocabularies(SITE_ID),
	api.getCatalogSearch(),
	api.getSpecification(),
	api.getOptions(),
]);

const { items: vocabularies } = await vocabulariesResponse.json<APIResponse>();
const { items: catalogs } = await catalogsResponse.json<APIResponse>();
const { items: specifications } = specificationResponse;
const { items: options } = optionsResponse;

const createProductFromCSV = new CreateProductFromCSV(
	vocabularies,
	catalogs,
	specifications,
	options,
);

await createProductFromCSV.run();
