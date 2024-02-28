import ky from "ky";
import config from "../config";

const marketplace = ky.extend({
    headers: {
        Cookie: `JSESSIONID=${config.download.jsessionid}`,
    },
    prefixUrl: config.download.home,
    timeout: 30000,
    retry: {
        limit: 3,
        methods: ["get"],
        statusCodes: [404],
    },
});

export { marketplace };
