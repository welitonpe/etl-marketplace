import { z } from "zod";

import { createProductFromJSONchema, liferayAuthSchema } from "../schemas/zod";
import { ENV } from "../config/env";
import { logger } from "../utils/logger";
import { paths } from "../utils/paths";
import api from "../services/api";
import {
	APIResponse,
	Catalog,
	Product,
	ProductOption,
	ProductSpecification,
	Vocabulary,
} from "../types";
import SearchBuilder from "../core/SearchBuilder";

/**
 * @description
 * Enforce the running of the script with the env properties
 */

const PRODUTC_OPTIONS_TYPES = {
	dxp: "dxp-license-usage-type",
	cloud: "trial",
};

const env = createProductFromJSONchema.parse(ENV);

class CreateProductFromJSON {
	env: z.infer<typeof createProductFromJSONchema>;
	logger = logger;

	constructor(
		private catalogs: Catalog[] = [],
		private specifications: ProductSpecification[] = [],
		private vocabularies: Vocabulary[] = [],
		private portalOptions: APIResponse<ProductOption>,
	) {
		this.env = env;
		const authSchema = liferayAuthSchema.parse(ENV);

		if (
			authSchema.LIFERAY_HOST.startsWith("https") &&
			!authSchema.LIFERAY_HOST.includes("-uat")
		) {
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

	async createCatalog(product: Product) {
		const catalogName = product.catalogName?.replaceAll("'", "''") as string;

		const catalogFiltered = this.catalogs.find(
			(catalog: Catalog) => catalog.name === catalogName,
		);

		if (catalogFiltered) {
			return catalogFiltered;
		}

		const accountResponse = await api.getAccounts(
			new URLSearchParams({
				filter: SearchBuilder.eq("name", catalogName as string),
			}),
		);

		const { items } = await accountResponse.json<APIResponse>();

		let accountId = items[0]?.id;

		if (!accountId) {
			const accountResponse = await api.createAccount({
				name: catalogName,
				type: "supplier",
			});

			const account = await accountResponse.json<{ id: number }>();

			accountId = account.id;
		}

		const response = await api.createCatalog({
			accountId,
			currencyCode: "USD",
			defaultLanguageId: "en_US",
			name: catalogName,
		});

		const catalog = await response.json<Catalog>();

		this.catalogs.push(catalog);

		return catalog;
	}

	async run() {
		const jsonProducts = await Bun.file(`${paths.json}/products.json`).json();

		for (const [index, product] of jsonProducts.entries()) {
			console.log("run  product:", product);
			// if (index === 2) {
			this.logger = logger.child(logger.bindings(), {
				msgPrefix: `${index}, ${product.name} - `,
			});

			let catalog;
			let categories = [];
			let createdProductId: number | string;
			let productOptionsValues;
			let productSpecifications: ProductSpecification[] = [];
			let skus: any[] = [];

			const [productOptions] = product.productOptions;
			const portalOptionValues = this.portalOptions.items;
			const productCategories = product?.categories;

			try {
				// // Verifica se o produto já existe e obtém seus dados
				// const existingProduct = await api.getProductByERC(
				// 	product.externalReferenceCode,
				// );
				throw new Error();
				// console.log("run  existingProduct:", existingProduct);
				// this.logger.info(
				// 	"Product already exists. Verifying associated elements...",
				// );
				// // Verifica se o catálogo associado já existe
				// catalog = await this.createCatalog(product);
				// // Verifica ou cria categorias se necessário
				// for (const category of productCategories) {
				// 	const existingCategory = existingProduct.categories.find(
				// 		(cat) =>
				// 			cat.name === category.name &&
				// 			cat.vocabulary === category.vocabulary,
				// 	);
				// 	if (!existingCategory) {
				// 		const vocabulary = this.vocabularies?.filter(
				// 			(vocabulary) =>
				// 				category.vocabulary.replaceAll("tag", "tags") ===
				// 					vocabulary.name
				// 						.replaceAll(" ", "-")
				// 						.replaceAll("tag", "tags")
				// 						.toLowerCase() || category.vocabulary === vocabulary.name,
				// 		);
				// 		if (vocabulary.length) {
				// 			const { items: categoryList } = await api.getCategories(
				// 				vocabulary[0]?.id,
				// 			);
				// 			const filteredCategory = categoryList?.filter(
				// 				(categoryResponse) => category.name === categoryResponse.name,
				// 			);
				// 			if (filteredCategory?.length) {
				// 				delete category.title;
				// 				categories.push({
				// 					...category,
				// 					id: filteredCategory[0]?.id,
				// 					siteId: ENV.SITE_ID,
				// 					title: { en_US: filteredCategory[0].name },
				// 				});
				// 			}
				// 		}
				// 	}
				// }
				// // Verifica ou cria especificações se necessário
				// for (const specification of product.productSpecifications) {
				// 	const existingSpecification =
				// 		existingProduct.productSpecifications.find(
				// 			(spec) =>
				// 				spec.specificationKey === specification.specificationKey,
				// 		);
				// 	if (!existingSpecification) {
				// 		const filteredSpecification = this.specifications.find(
				// 			(spc) => specification.specificationKey === spc.key,
				// 		);
				// 		if (filteredSpecification) {
				// 			productSpecifications.push({
				// 				id: filteredSpecification.id,
				// 				specificationKey: filteredSpecification?.key as string,
				// 				value: {
				// 					en_US: await this.getVersionNumber(specification.value),
				// 				},
				// 			});
				// 		}
				// 	}
				// }
				// // Verifica ou cria imagens se necessário
				// const maxAttempts = 3;
				// for (const image of product.images) {
				// 	const existingImage = existingProduct.images.find(
				// 		(img) => img.title.en_US === image.title,
				// 	);
				// 	console.log("JSON", image);
				// 	console.log("existingImage:", existingImage);
				// 	if (!existingImage) {
				// 		let attempt = 0;
				// 		let imageCreated = false;
				// 		while (attempt < maxAttempts && !imageCreated) {
				// 			try {
				// 				await api.createImage(
				// 					{
				// 						attachment: await this.getImageAsBase64(image.src),
				// 						galleryEnabled: image.galleryEnabled,
				// 						neverExpire: true,
				// 						priority: image.priority,
				// 						tags: image.tags || [],
				// 						title: { en_US: image.title },
				// 					},
				// 					product.externalReferenceCode,
				// 				);
				// 				imageCreated = true; // A imagem foi criada com sucesso, saímos do loop
				// 			} catch (error) {
				// 				attempt++;
				// 				this.logger.error(
				// 					`${index} - Failed to create image ${image.title} (Attempt ${attempt} of ${maxAttempts}): ` +
				// 						error,
				// 				);
				// 				if (attempt >= maxAttempts) {
				// 					this.logger.error(
				// 						`${index} - Exceeded max attempts for image ${image.title}. Moving to next image.`,
				// 					);
				// 				}
				// 			}
				// 		}
				// 	}
				// }
				// this.logger.info(
				// 	"All associated elements verified or created successfully.",
				// );
			} catch (error) {
				this.logger.info("Product not found. Creating product...");

				// Se o produto não existir, cria todas as associações normalmente
				catalog = await this.createCatalog(product);

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
							categories.push({
								...category,
								id: filteredCategory[0]?.id,
								siteId: ENV.SITE_ID,
								title: { en_US: filteredCategory[0].name },
							});
						}
					}
				}

				// FILTER SPECIFICATIONS
				for (const specification of product.productSpecifications) {
					const filteredSpecification = this.specifications.find(
						(spc) => specification.specificationKey === spc.key,
					);

					if (filteredSpecification) {
						productSpecifications.push({
							id: filteredSpecification.id,
							specificationKey: filteredSpecification?.key as string,
							value: {
								en_US: await this.getVersionNumber(specification.value),
							},
						});
					}
				}

				let productoptions: ProductOption[] = [];

				if (product.productSpecifications.length) {
					const isBundledProduct = product.productSpecifications.filter(
						(specification: ProductSpecification) =>
							specification.value === "Bundled",
					);

					if (!isBundledProduct.length) {
						const [productType] = product.productSpecifications.filter(
							(specification: ProductSpecification) => {
								return specification.specificationKey === "type";
							},
						);

						if (productType) {
							const type =
								PRODUTC_OPTIONS_TYPES[
									productType?.value as keyof typeof PRODUTC_OPTIONS_TYPES
								];

							const [getOptionKey] = portalOptionValues?.filter(
								(option) => option?.key === type,
							);

							const productOptionValues =
								productOptions.productOptionValues.map((optionValue: any) => {
									return {
										key: optionValue.key,
										name: {
											en_US: optionValue.name,
										},
										priority: optionValue.priority,
									};
								});

							productoptions = [
								{
									catalogId: catalog.id,
									facetable: false,
									fieldType: "radio",
									key: productOptions.key,
									name: { en_US: productOptions.name },
									optionId: getOptionKey.id as unknown as string,
									productOptionValues: productOptionValues,
									required: productOptions.required,
									skuContributor: productOptions.skuContributor,
								},
							];
						}
					}
				}

				const createdProduct = await api
					.postProduct({
						active: true,
						catalogId: catalog.id,
						categories: categories,
						description: {
							en_US: product.description,
						},
						externalReferenceCode: product.externalReferenceCode,
						name: {
							en_US: product.name,
						},
						productSpecifications,
						productType: "virtual",
						productOptions: productoptions,
					})
					.catch((error) =>
						logger.error(`${index} - Failed to create ${product.name}` + error),
					);

				createdProductId = createdProduct?.productId as number;

				// CREATE SKUS
				const { items: createdProductoptions } =
					await api.getProductOptionsByProductId(createdProductId);
				if (createdProductoptions.length) {
					const { items: createdOptionsValues } =
						await api.getProductOptionsByOptionId(createdProductoptions[0].id);

					skus = product.skus.map((productSku: any) => {
						const { published, purchasable, skuOptions } = productSku;
						return {
							published,
							purchasable,
							sku: `${createdProductId} - ${skuOptions[0].skuOptionValueKey} `,
							skuOptions: [
								{
									key: createdProductoptions[0].id,
									value: createdOptionsValues.filter(
										(optionValue) =>
											optionValue.key === skuOptions[0].skuOptionValueKey,
									)[0].id,
								},
							],
						};
					});

					const createdSKUS = await Promise.all(
						skus.map((sku) =>
							api.createProductSKU(createdProductId as number, sku),
						),
					);
					console.log("run  createdSKUS:", createdSKUS);

					// TIER PRICE
					const priceList = await api.getPriceList(
						new URLSearchParams({
							filter: SearchBuilder.eq("name", catalog.name as string),
						}),
					);

					const createdPriceList = await api.createPriceList({
						name: catalog.name,
						catalogId: catalog.id,
						currencyCode: "USD",
						type: "price-list",
					});

					const test = {
						customFields: {
							additionalProp1: {},
							additionalProp2: {},
							additionalProp3: {},
						},
						externalReferenceCode: "AB-34098-789-N",
						hasTierPrice: true,
						id: 30130,
						price: 30130,
						priceListExternalReferenceCode: "PLAB-34098-789-N",
						priceListId: 20078,
						promoPrice: 30130,
						sku: "BL500IC",
						skuExternalReferenceCode: "CAB-34098-789-N",
						skuId: 30130,
						tierPrices: [
							{
								customFields: {
									additionalProp1: {},
									additionalProp2: {},
									additionalProp3: {},
								},
								externalReferenceCode: "AB-34098-789-N",
								id: 31130,
								minimumQuantity: 5,
								price: 25,
								priceEntryExternalReferenceCode: "CAB-34098-789-N",
								priceEntryId: 30130,
								promoPrice: 20,
							},
						],
					};
					const priceEntries = await api.getPriceEntries(
						createdPriceList?.id as number,
					);
				}

				const maxAttempts = 3;

				for (const image of product.images) {
					let attempt = 0;
					let imageCreated = false;

					while (attempt < maxAttempts && !imageCreated) {
						try {
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
							imageCreated = true; // A imagem foi criada com sucesso, saímos do loop
						} catch (error) {
							attempt++;
							this.logger.error(
								`${index} - Failed to create image ${image.title} (Attempt ${attempt} of ${maxAttempts}): ` +
									error,
							);

							if (attempt >= maxAttempts) {
								this.logger.error(
									`${index} - Exceeded max attempts for image ${image.title}. Moving to next image.`,
								);
							}
						}
					}
				}

				//CREATE PRODUCT OPTIONS
				// if (product.productSpecifications.length) {
				// 	const isBundledProduct = product.productSpecifications.filter(
				// 		(specification: ProductSpecification) =>
				// 			specification.value === "Bundled",
				// 	);

				// 	if (!isBundledProduct.length) {
				// 		const [productType] = product.productSpecifications.filter(
				// 			(specification: ProductSpecification) => {
				// 				return specification.specificationKey === "type";
				// 			},
				// 		);

				// 		if (productType) {
				// 			const type =
				// 				PRODUTC_OPTIONS_TYPES[
				// 					productType?.value as keyof typeof PRODUTC_OPTIONS_TYPES
				// 				];

				// 			const [getOptionKey] = portalOptionValues?.filter(
				// 				(option) => option?.key === type,
				// 			);

				// 			const productOptionValues =
				// 				productOptions.productOptionValues.map((optionValue: any) => {
				// 					return {
				// 						key: optionValue.key,
				// 						name: {
				// 							en_US: optionValue.name,
				// 						},
				// 						priority: optionValue.priority,
				// 					};
				// 				});

				// 			const productoptions = [
				// 				{
				// 					facetable: false,
				// 					fieldType: "radio",
				// 					key: productOptions.key,
				// 					name: {
				// 						en_US: productOptions.name,
				// 					},
				// 					optionId: getOptionKey.id,
				// 					productOptionValues: productOptionValues,
				// 					required: productOptions.required,
				// 					skuContributor: productOptions.skuContributor,
				// 				},
				// 			];

				// 			const createdProductOptions = await api.postProductOptions(
				// 				createdProductId,
				// 				productoptions,
				// 			);

				// 			console.log(
				// 				"run  createdProductOptions:",
				// 				await createdProductOptions.json(),
				// 			);
				// 		}
				// 	}
				// }

				this.logger.info("created");
			}
			// }
		}
	}
}

const searchParams = new URLSearchParams({ pageSize: "300" });

// Trigger the Authentication
await api.myUserAccount();

const [
	catalogsResponse,
	specificationResponse,
	vocabulariesResponse,
	portalOptionsResponse,
] = await Promise.all([
	api.getCatalogs(searchParams),
	api.getSpecification(searchParams),
	api.getTaxonomyVocabularies(ENV.SITE_ID as string),
	api.getOptions(),
]);

const { items: catalogs } = await catalogsResponse.json<APIResponse>();
const { items: specifications } = await specificationResponse.json<
	APIResponse<ProductSpecification>
>();
const { items: vocabularies } = await vocabulariesResponse.json<APIResponse>();
const portalOptions = await portalOptionsResponse.json<APIResponse>();

const createProductFromJSON = new CreateProductFromJSON(
	catalogs,
	specifications,
	vocabularies,
	portalOptions,
);

await createProductFromJSON.run();
