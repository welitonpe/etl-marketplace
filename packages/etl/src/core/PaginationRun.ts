import { APIResponse } from "../types";
import { logger } from "../utils/logger";

export default class PaginationRun<T> {
    protected logger = logger;
    protected processedItems = 0;

    constructor(
        protected fetchData: (
            page: number,
            pageSize: number
        ) => Promise<APIResponse<T>>
    ) {
        logger.info(`Starting the process ${this.constructor.name}`);
    }

    protected async processItem(item: T, index: number) {
        throw new Error("Implementation needed");
    }

    protected async processFinished() {}

    public async run(page = 1, pageSize = 20) {
        const { items, ...productResponse } = await this.fetchData(
            page,
            pageSize
        );

        logger.info(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        let index = 0;
        for (const item of items) {
            await this.processItem(item, index);

            this.processedItems++;
            index++;
        }

        if (productResponse.page === productResponse.lastPage) {
            logger.info("Processed Items", this.processedItems);

            await this.processFinished();

            return;
        }

        await this.run(page + 1, pageSize);
    }
}
