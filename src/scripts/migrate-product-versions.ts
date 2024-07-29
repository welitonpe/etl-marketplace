import { OSB_PortalRelease } from "@prisma/client";

import "../core/SafeRunner";

import { ENV } from "../config/env";
import { migrateProductVersionSchema } from "../schemas/zod";
import { Product, ProductPage } from "../types";
import api from "../services/api";
import Prisma from "../core/Prisma";

class MigrateProductVersions {
    private portalReleases: OSB_PortalRelease[];
    private processedProducts = 0;

    constructor(portalReleases: OSB_PortalRelease[]) {
        // Do not process this script if
        // the environment variables are missing

        migrateProductVersionSchema.parse(ENV);

        this.portalReleases = portalReleases;
    }

    async createProductSpecification() {}
    async createVirtualItem() {}
    async unzipFolder() {}

    async processProduct(product: Product) {
        const appEntryId = product.externalReferenceCode;

        /**
         Search inside etl/downloads/${appEntryId}:

         * 1. If the folder exists, create the folder etl/downloads/${appEntryId}/extracted_zip
         * 2. Unzip the file inside the folder created before. (note, do not unzip the -src-*.zip) inside this folder.
         */

        await this.unzipFolder();

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

        await this.createVirtualItem();

        /**
         * Create the specification for this version
         */

        await this.createProductSpecification();
    }

    async run(page = 1, pageSize = 50) {
        const response = await api.getProducts(page, pageSize);

        const { items: products, ...productResponse } =
            await response.json<ProductPage>();

        console.log(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        for (const product of products) {
            await this.processProduct(product);

            this.processedProducts++;
        }

        if (productResponse.page === productResponse.lastPage) {
            console.log("Processed Products", this.processedProducts);
        } else {
            await this.run(page + 1, pageSize);
        }
    }
}

const portalReleases = await Prisma.oSB_PortalRelease.findMany();

const migrateProductVersions = new MigrateProductVersions(portalReleases);

await migrateProductVersions.run();
