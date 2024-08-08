import "../core/SafeRunner";

import { OSB_PortalRelease } from "@prisma/client";
import * as fs from "fs/promises";

import { ENV } from "../config/env";
import { migrateProductVersionSchema } from "../schemas/zod";
import { path, paths } from "../utils/paths";
import {
    APIResponse,
    Product,
    ProductPage,
    ProductSpecifications,
} from "../types";
import { logger } from "../utils/logger";
import api from "../services/api";
import Prisma from "../core/Prisma";
import SearchBuilder from "../core/SearchBuilder";

const DOCUMENTS_ROOT_FOLDER = 0;
const PACKAGE_FOLDER_NAME = "packages";
const PICK_LIST_ASSET_TYPE = "sourceCode";
const PUBLISHER_ASSETS_FOLDER = "publisher_assets";
const SOURCE_CODE_FOLDER_NAME = "source_code";
const SPECIFICATION_LIFERAY_VERSION_KEY = "liferay-version";

class MigrateProductVersions {
    private processedProducts = 0;

    constructor(
        private assetFolderId: string,
        private liferayVersionSpecification: ProductSpecifications,
        private portalReleases: OSB_PortalRelease[]
    ) {
        // Do not process this script if
        // the environment variables are missing

        migrateProductVersionSchema.parse(ENV);
    }

    async createVirtualItem(
        productId: number,
        productVirtualSettingsFileEntries: any
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

    async processLPKGs(entryPath: string, lpkgs: string[], product: Product) {
        const productVirtualSettingsFileEntries = [];

        for (const lpkg of lpkgs) {
            const lpkgBuildNumber = this.getLPKGBuildNumber(lpkg);

            const liferayVersion = this.portalReleases.find(
                (release) => release.buildNumber?.toString() === lpkgBuildNumber
            );

            const versionName = liferayVersion?.versionName as string;

            if (!liferayVersion) {
                logger.error(`Version ${lpkgBuildNumber} Not found`);

                continue;
            }

            const attachment = await fs.readFile(
                path.join(entryPath, PACKAGE_FOLDER_NAME, lpkg),
                { encoding: "base64" }
            );

            productVirtualSettingsFileEntries.push({
                attachment,
                version: versionName,
            });

            const { productId, productSpecifications } = product;

            const liferayVersions = productSpecifications.filter(
                (specification) =>
                    specification.specificationKey ===
                        SPECIFICATION_LIFERAY_VERSION_KEY &&
                    specification.value.en_US === versionName
            );

            if (!liferayVersions.length) {
                await api.createProductSpecification(productId, {
                    id: this.liferayVersionSpecification.id,
                    specificationKey: SPECIFICATION_LIFERAY_VERSION_KEY,
                    value: {
                        en_US: liferayVersion?.versionName as string,
                    },
                });

                logger.info("Specification has created successfully");

                continue;
            }

            logger.info("Specification already exists");
        }

        await this.createVirtualItem(
            product.productId,
            productVirtualSettingsFileEntries
        );

        logger.info("Virtual Entry created");
    }

    async processSourceCode(entryPath: string, product: Product) {
        const sourceCodeFiles = await fs.readdir(
            path.join(entryPath, SOURCE_CODE_FOLDER_NAME)
        );

        for (const sourceCodeFile of sourceCodeFiles) {
            const file = Bun.file(
                path.join(entryPath, SOURCE_CODE_FOLDER_NAME, sourceCodeFile)
            );

            const blob = await Bun.readableStreamToBlob(file.stream());

            const formData = new FormData();

            formData.append("file", blob, sourceCodeFile);

            const publisherFolderName = sourceCodeFile
                .replaceAll("-", "")
                .replaceAll(".", "")
                .replace("zip", "");

            const {
                items: [hasSourceCodeFolder],
            } = await api.getDocumentFolderDocumentSubFolders(
                this.assetFolderId as unknown as number,
                new URLSearchParams({
                    filter: SearchBuilder.contains("name", publisherFolderName),
                })
            );

            let publisherFolderId = hasSourceCodeFolder?.id;

            if (!hasSourceCodeFolder) {
                const createFolderResponse = await api.createDocumentFolder(
                    publisherFolderName,
                    this.assetFolderId as unknown as number
                );

                publisherFolderId = createFolderResponse?.id;
            }

            const { items } = await api.getDocumentFolderDocuments(
                publisherFolderId
            );

            const document = items.find(
                (document) => document.fileName === sourceCodeFile
            );

            let documentId = document?.id;

            if (!documentId) {
                const sourceDocument = await api.createDocumentFolderDocument(
                    publisherFolderId,
                    formData
                );

                documentId = sourceDocument.id;

                logger.info(`Document Folder ${product.name.en_US} created`);
            }

            await api
                .createPublisherAsset({
                    name: product.name.en_US,
                    publisherAssetType: PICK_LIST_ASSET_TYPE,
                    r_accountEntryToPublisherAssets_accountEntryId:
                        product.catalog.accountId,
                    r_productEntryToPublisherAssets_CPDefinitionId:
                        product.id as unknown as string,
                    sourceCode: documentId,
                    version:
                        "PLEASE_FIX_ME_PLEASE_FIX_ME_PLEASE_FIX_ME_PLEASE_FIX_ME_PLEASE_FIX_ME",
                })
                .catch((error) =>
                    logger.error(
                        `Error to process Publisher Asset - ${
                            product.name.en_US
                        } / ${(error as Error).message}`
                    )
                );

            logger.info(`Publisher Asset ${product.name.en_US} created`);
        }
    }

    async processFolders(product: Product) {
        const appEntryId = product.externalReferenceCode;
        const entryPath = path.join(paths.download, appEntryId);
        const hasEntryDirectory = await fs.exists(entryPath);

        if (!hasEntryDirectory) {
            return logger.error(
                `Folder not found for ${product.name}, skipping...`
            );
        }

        const hasExtractedFolder = await fs.exists(
            path.join(entryPath, PACKAGE_FOLDER_NAME)
        );

        if (!hasExtractedFolder) {
            return;
        }

        const lpkgs = await fs.readdir(
            path.join(entryPath, PACKAGE_FOLDER_NAME)
        );

        await this.processLPKGs(entryPath, lpkgs, product).catch((error) =>
            logger.error(
                `Failed to process Virtual Entry - ${product.name.en_US} - ${
                    (error as Error).message
                }`
            )
        );

        await this.processSourceCode(entryPath, product).catch((error) =>
            logger.error(
                `Failed to process Source Code ${product.name.en_US} - ${
                    (error as Error).message
                } `
            )
        );
    }

    async run(page = 1, pageSize = 50) {
        const response = await api.getProducts(page, pageSize);

        const { items: products, ...productResponse } =
            await response.json<ProductPage>();

        logger.info(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        for (const [index, product] of products.entries()) {
            logger.info("Processing Product");
            logger.info(`PAGE: ${page} INDEX:${index}`);
            logger.info(product.name.en_US);

            await this.processFolders(product);

            logger.info(`\n\n`);

            this.processedProducts++;
        }
        if (productResponse.page === productResponse.lastPage) {
            logger.info("Processed Products", this.processedProducts);
        } else {
            await this.run(page + 1, pageSize);
        }
    }

    static async getAssetFolderId() {
        const documentFoldersResponse = await api.getDocumentFolders(
            new URLSearchParams({
                filter: SearchBuilder.contains("name", PUBLISHER_ASSETS_FOLDER),
            })
        );

        const {
            items: [firstFolder],
        } = await documentFoldersResponse.json<APIResponse>();

        if (firstFolder) {
            return firstFolder?.id;
        }

        const createFolderResponse = await api.createDocumentFolder(
            PUBLISHER_ASSETS_FOLDER,
            DOCUMENTS_ROOT_FOLDER
        );

        return createFolderResponse?.id;
    }
}

const [publisherAssetFolderId, portalReleases, specificationResponse] =
    await Promise.all([
        MigrateProductVersions.getAssetFolderId(),
        Prisma.oSB_PortalRelease.findMany(),
        api.getSpecification(),
    ]);

const liferayVersionSpecification = specificationResponse.items.find(
    (specification) => specification.key === SPECIFICATION_LIFERAY_VERSION_KEY
);

const migrateProductVersions = new MigrateProductVersions(
    publisherAssetFolderId,
    liferayVersionSpecification as ProductSpecifications,
    portalReleases
);

await migrateProductVersions.run();
await Prisma.$disconnect();

logger.info("Finished");

process.exit();
