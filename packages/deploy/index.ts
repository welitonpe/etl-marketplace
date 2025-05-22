#!/usr/bin/env bun

import fs from "fs";
import path from "path";
import figlet from "figlet";
import prompts from "prompts";
import { $ } from "zx";
import "zx/globals";

const LCP_PROJECT = "exte5a2marketplace";
$.verbose = false;
$.quiet = false;

const STATIC_DOMAIN = {
    extuat: "https://liferaymarketplacecustomelement-exte5a2marketp8988.lfr.cloud",
    extprd: "https://liferaymarketplacecustomelement-exte5a2marketp8118.lfr.cloud",
};

class MarketplaceDeploy {
    constructor() {
        console.log(
            figlet.textSync("Marketplace", {
                font: "Big",
            }),
            "Deployment",
            "\n"
        );
    }

    async abort(message: string) {
        console.error(message);

        process.exit(1);
    }

    async deploy(
        currentDir: string,
        detectedType: Awaited<ReturnType<typeof this.detectProjectType>>,
        environment: string
    ) {
        const dirName = path.basename(currentDir);

        console.log(
            `Deploying ${dirName} project to ${environment}...`,
            new Date()
        );

        let args = "";
        let packageName = "";

        const project = `${LCP_PROJECT}-${environment}`;

        try {
            if (detectedType.hasPackageJson) {
                args = `BASE_URL=${
                    STATIC_DOMAIN[environment as keyof typeof STATIC_DOMAIN]
                }`;

                const packageJson = JSON.parse(
                    fs.readFileSync(
                        path.join(currentDir, "package.json"),
                        "utf8"
                    )
                );

                packageName = packageJson.name;
            }

            console.log("Start project build...");

            $.verbose = true;
            await $`${args} gw clean build`;

            console.log("Start deployment...");

            await $`lcp deploy --project ${project} --extension dist/*.zip`;

            $.verbose = false;

            console.log(`Deployment to ${environment} completed successfully!`);
        } catch (error) {
            console.error("Deployment failed:", error);
            process.exit(1);
        }
    }

    async detectProjectType(currentDir: string) {
        return {
            hasBuildGradle: fs.existsSync(
                path.join(currentDir, "build.gradle")
            ),
            hasPackageJson: fs.existsSync(
                path.join(currentDir, "package.json")
            ),
        };
    }

    async init() {
        const currentDir = process.cwd();

        try {
            const detectedType = await this.detectProjectType(currentDir);

            if (!detectedType.hasBuildGradle && !detectedType.hasPackageJson) {
                return this.abort(
                    "Unsupported project type. Deployment aborted."
                );
            }

            const { environment } = await prompts({
                type: "select",
                name: "environment",
                message: "Select deployment environment:",
                choices: [
                    {
                        title: `UAT (${LCP_PROJECT}-extuat)`,
                        value: "extuat",
                    },
                    {
                        title: `Production (${LCP_PROJECT}-extprd)`,
                        value: "extprd",
                    },
                ],
            });

            if (!environment) {
                return this.abort(
                    "No environment selected. Deployment aborted."
                );
            }

            if (environment.includes("extprd")) {
                const { confirm } = await prompts({
                    type: "confirm",
                    name: "confirm",
                    message:
                        "Are you sure you want to deploy to production? (y/n)",
                });

                if (!confirm) {
                    return this.abort(
                        "Deployment to production aborted. No changes made."
                    );
                }
            }

            // Deploy the project
            await this.deploy(currentDir, detectedType, environment);
        } catch (error) {
            this.abort("Initialization failed:" + error);
        }
    }
}

const marketplaceDeploy = new MarketplaceDeploy();

await marketplaceDeploy.init();
