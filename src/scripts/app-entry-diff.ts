import Prisma from "../core/Prisma";
import { path, paths } from "../utils/paths";

class AppEntryDiff {
    async getCSVLines() {
        const csv = await Bun.file(path.join(paths.csv, "products.csv")).text();

        return csv.split("\n");
    }

    async run() {
        const appEntries = await Prisma.oSB_AppEntry.findMany();
        const lines = await this.getCSVLines();

        let i = 0;
        for (const appEntry of appEntries) {
            const lineFound = lines.some(
                (line) =>
                    line.includes(appEntry.title as string) ||
                    line.includes(appEntry.appEntryId as unknown as string)
            );

            if (!lineFound) {
                console.log(i, appEntry.title);
                i++;
            }
        }
    }

    async runCSVProducts() {
        const lines = await this.getCSVLines();

        let i = 0;

        for (const line of lines) {
            const [externalReferenceCode, id, productName] = line.split(";");

            const isUUID = externalReferenceCode.includes("-");

            const where = {
                ...(isUUID && { title: productName }),
                ...(!isUUID && { appEntryId: Number(externalReferenceCode) }),
            } as any;

            const appEntry = await Prisma.oSB_AppEntry.findUnique({ where });

            if (appEntry === null) {
                i++;
                console.log(i, productName, appEntry === null);
            }
        }
    }
}

const appEntryDiff = new AppEntryDiff();

await appEntryDiff.run();
