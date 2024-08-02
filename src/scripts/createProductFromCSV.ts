import api from "../services/api";
import { paths } from "../utils/paths";
import pino from "pino";

const logger = pino({
	level: "info",
	transport: {
		target: "pino-pretty",
	},
});

const ENV = import.meta.env;
const CATALOG_ID = ENV.CATALOG_ID;

class PostProductFromCSV {
	async run() {
		const file = Bun.file(`${paths.csv}/producst_list.csv`);
		const textFileContent = await file.text();
		const csvProductList = [...textFileContent.split("\n")]
			.map((product) => product.split(";"))
			.map((item) => ({
				erc: item[0],
				id: item[1],
				appName: item[2],
			}));

		for (const [index, product] of csvProductList.entries()) {
			const bodyRequest = {
				active: true,
				catalogId: CATALOG_ID,
				externalReferenceCode: product.erc,
				name: {
					en_US: product.appName,
				},
				productType: "virtual",
			};

			try {
				await api.postProduct(bodyRequest);
				logger.info(
					`${index} - Product ${product.appName}, created successfully!`,
				);
			} catch (error) {
				logger.error(
					`${index} - Create product ${product.appName} failed`,
					error,
				);
			}
		}
	}
}

const postProductFromCSV = new PostProductFromCSV();
await postProductFromCSV.run();
