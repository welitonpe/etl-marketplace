import { APIResponse } from "../types";

export default class PaginationRun<T> {
    protected processedItems = 0;

    constructor(
        protected fetchData: (
            page: number,
            pageSize: number
        ) => Promise<APIResponse<T>>
    ) {}

    protected async processItem(item: T, index: number) {
        throw new Error("Implementation needed");
    }

    protected async processFinished() {}

    public async run(page = 1, pageSize = 20) {
        const { items, ...productResponse } = await this.fetchData(
            page,
            pageSize
        );

        console.log(
            `Start Processing - Page: ${productResponse.page}/${productResponse.lastPage}`
        );

        let index = 0;
        for (const item of items) {
            await this.processItem(item, index);

            this.processedItems++;
            index++;
        }

        if (productResponse.page === productResponse.lastPage) {
            console.log("Processed Items", this.processedItems);

            await this.processFinished();

            return;
        }

        await this.run(page + 1, pageSize);
    }
}
