import { OSB_PortalRelease } from "@prisma/client";

import "../core/SafeRunner";

import { ENV } from "../config/env";
import { migrateProductVersionSchema } from "../schemas/zod";
import { Product, ProductPage, ProductSpecifications } from "../types";
import api from "../services/api";
import Prisma from "../core/Prisma";
import * as fs from "fs/promises";
import { path, paths } from "../utils/paths";
import SearchBuilder from "../core/SearchBuilder";
import pino from "pino";

const logger = pino({
	level: "info",
	transport: {
		target: "pino-pretty",
	},
});

const PACKAGE_FOLDER_NAME = "packages";
const SOURCE_CODE_FOLDER_NAME = "source_code";
const LIFERAY_VERSION_KEY = "liferay-version";
const PUBLISHER_ASSETS_FOLDER = "publisher_assets";
const PICK_LIST_ASSET_TYPE = "sourceCode";
let publisherAssetFolderId;

class MigrateProductVersions {
	private processedProducts = 0;

	constructor(
		private portalReleases: OSB_PortalRelease[],
		private specifications: ProductSpecifications,
		private asetFolderId: string,
	) {
		// Do not process this script if
		// the environment variables are missing

		migrateProductVersionSchema.parse(ENV);
	}

	async checkDirectory(path: string) {
		return fs.exists(path);
	}

	async createProductSpecification(
		productId: number,
		value: string,
		specificationId: number,
	) {
		const specification = {
			id: specificationId,
			specificationKey: LIFERAY_VERSION_KEY,
			value: {
				en_US: value,
			},
		};

		return await api.updateProducts(productId, specification);
	}

	async createVirtualItem(
		productId: number,
		productVirtualSettingsFileEntries: any,
	) {
		const productVirtualEntry = {
			productVirtualSettings: {
				productVirtualSettingsFileEntries,
			},
		};

		return api.updateProduct(productId, productVirtualEntry);
	}

	getLPKGBuildNumber(fileName: string) {
		return fileName.split("-").at(-1)?.replace(".lpkg", "");
	}

	async processFolders(product: Product) {
		const appEntryId = product.externalReferenceCode;
		const entryPath = path.join(paths.test, appEntryId);
		const hasEntryDirectory = await this.checkDirectory(entryPath);
		let publiserFolderId;
		let documentId;
		let versionName: string | null | undefined;

		if (hasEntryDirectory) {
			const hasExtractedFolder = await this.checkDirectory(
				path.join(entryPath, PACKAGE_FOLDER_NAME),
			);

			if (!hasExtractedFolder) {
				return;
			}

			const lpkgs = await fs.readdir(path.join(entryPath, PACKAGE_FOLDER_NAME));

			const productVirtualSettingsFileEntries = [];

			for (const lpkg of lpkgs) {
				const lpkgBuildNumber = this.getLPKGBuildNumber(lpkg);

				const liferayVersion = this.portalReleases.find(
					(release) => release.buildNumber?.toString() === lpkgBuildNumber,
				);

				versionName = liferayVersion?.versionName;

				if (!liferayVersion) {
					logger.error(`Version ${lpkgBuildNumber} Not found`);

					continue;
				}

				const attachment = await fs.readFile(
					path.join(entryPath, PACKAGE_FOLDER_NAME, lpkg),
					{ encoding: "base64" },
				);

				productVirtualSettingsFileEntries.push({
					attachment,
					version: versionName,
				});

				const { productId, productSpecifications } = product;

				const liferayVersions = productSpecifications.filter(
					(specification) =>
						specification.specificationKey === LIFERAY_VERSION_KEY &&
						specification.value.en_US === versionName,
				);

				if (!liferayVersions.length) {
					this.createProductSpecification(
						productId,
						liferayVersion?.versionName as string,
						this.specifications.id,
					);

					logger.info("Specification has created successfully");
					return;
				}

				logger.info("Specification already exists");
			}

			try {
				await this.createVirtualItem(
					product.productId,
					productVirtualSettingsFileEntries,
				);
				logger.info("CREATE VIRTUAL - created successfully");
			} catch (err) {
				logger.error(`CREATE VIRTUAL - ${product.name.en_US} `);
			}

			try {
				const sourcesCode = await fs.readdir(
					path.join(entryPath, SOURCE_CODE_FOLDER_NAME),
				);

				const file = Bun.file(
					path.join(entryPath, SOURCE_CODE_FOLDER_NAME, sourcesCode[0]),
				).stream();

				const blob = await Bun.readableStreamToBlob(file);

				var formdata = new FormData();

				formdata.append("file", blob, sourcesCode[0]);

				const publisherFolderName = sourcesCode[0]
					.replaceAll("-", "")
					.replaceAll(".", "")
					.replace("zip", "");

				const {
					items: [hasSourceCodeFolder],
				} = await api.getDocumentSubFolders(
					this.asetFolderId as unknown as number,
					new URLSearchParams({
						filter: SearchBuilder.contains("name", publisherFolderName),
					}),
				);

				publiserFolderId = hasSourceCodeFolder?.id;

				if (!hasSourceCodeFolder) {
					const createFolderResponse = await api.createDocumentFolder(
						publisherFolderName,
						this.asetFolderId as unknown as number,
					);
					publiserFolderId = createFolderResponse?.id;
				}

				const { items } = await api.getDocumentSearch(publiserFolderId);

				const [hasDocument] = items.filter(
					(document: any) => document.fileName === sourcesCode[0],
				);

				documentId = hasDocument?.id;

				if (!documentId) {
					const sourceDocument = await api.createDocumentFolderDocument(
						publiserFolderId,
						formdata,
					);

					documentId = sourceDocument.id;

					logger.error(
						`SOURCE CODE - ${product.name.en_US} - > UPLOADED SUCCESSFULY `,
					);
				}

				try {
					await api.createSourceCodeProductRelationShip({
						name: product.name.en_US,
						version: versionName,
						r_accountEntryToPublisherAssets_accountEntryId:
							product.catalog.accountId,
						r_productEntryToPublisherAssets_CPDefinitionId:
							product.id as unknown as string,
						sourceCode: documentId,
						publisherAssetType: PICK_LIST_ASSET_TYPE,
					});

					logger.error(
						`CREATE RELATIONSHIP - ${product.name.en_US} - > CREATED SUCCESSFULY `,
					);
				} catch (err) {
					logger.error(
						`CREATE RELATIONSHIP - ${product.name.en_US} - > ${err.message} `,
					);
				}
			} catch (err) {
				logger.error(`SOURCE CODE - ${product.name.en_US} - > ${err.message} `);
			}
		}
	}

	async processProduct(product: Product) {
		const appEntryId = product.externalReferenceCode;
		/**
         Search inside etl/downloads/${appEntryId}:
		 
         * 1. If the folder exists, create the folder etl/downloads/${appEntryId}/extracted_zip
         * 2. Unzip the file inside the folder created before. (note, do not unzip the -src-*.zip) inside this folder.
         */
		await this.processFolders(product);
		/**
		 * Inside etl/downloads/${appEntryId}/extracted_zip for each .lpkg
		 * Create a Virtual Item entry inside the product
		 * note: The .lpkg file contains the App name + Builder number
		 * something like: My App-6210.lpkg
		 * Analyze the build number 6210 for example and search for this number
		 * Inside this array: portalReleases
		 * The property is buildNumber and the version necessary to set on Liferay is
		 * versionName
		 */

		/**
		 * Create the specification for this version
		 */
	}

	async run(page = 1, pageSize = 50) {
		const response = await api.getProducts(page, pageSize);

		const { items: products, ...productResponse } =
			await response.json<ProductPage>();

		logger.info(
			`Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`,
		);

		for (const [index, product] of products.entries()) {
			logger.info("Processing Product");
			logger.info(`PAGE: ${page} INDEX:${index}`);
			logger.info(product.name.en_US);

			await this.processProduct(product);

			logger.info(`\n\n`);

			this.processedProducts++;
		}
		if (productResponse.page === productResponse.lastPage) {
			logger.info("Processed Products", this.processedProducts);
		} else {
			await this.run(page + 1, pageSize);
		}
	}
}

const getDocumentFoldersResponse = await api.getDocumentFolders(
	new URLSearchParams({
		filter: SearchBuilder.contains("name", PUBLISHER_ASSETS_FOLDER),
	}),
);

const {
	items: [hasSourceCodeFolder],
} = await getDocumentFoldersResponse.json<any>();

publisherAssetFolderId = hasSourceCodeFolder?.id;

if (!hasSourceCodeFolder) {
	const createFolderResponse = await api.createDocumentFolder(
		PUBLISHER_ASSETS_FOLDER,
		0,
	);

	publisherAssetFolderId = createFolderResponse?.id;
}

const portalReleases = await Prisma.oSB_PortalRelease.findMany();

const response = await api.getSpecification();

const { items: specifications } = await response.json<any>();

const [liferayVersionsSpecification]: ProductSpecifications[] =
	specifications.filter(
		(specification: ProductSpecifications) =>
			specification.key === LIFERAY_VERSION_KEY,
	);

const migrateProductVersions = new MigrateProductVersions(
	portalReleases,
	liferayVersionsSpecification,
	publisherAssetFolderId,
);

await migrateProductVersions.run();
await Prisma.$disconnect();
logger.info("Finished");
process.exit();
