import ky from "ky";
import config from "../config";
import Cache from "../utils/cache";

const liferay = ky.extend({
	prefixUrl: config.OAUTH_HOST,
});

const cache = Cache.getInstance();

export default liferay.extend({
	headers: {
		Authorization: "",
	},
	hooks: {
		beforeRequest: [
			(request) => {
				const authorization = cache.get("authorization");

				if (authorization) {
					request.headers.set("Authorization", authorization);
				}
			},
		],
		beforeRetry: [
			async ({ request, options, error, retryCount }) => {
				const isExpired = cache.has("expires_in")
					? Date.now() < cache.get("expires_in")
					: false;

				if (!request.headers.get("Authorization") || isExpired) {
					const searchParams = new URLSearchParams();

					searchParams.set("client_id", config.CLIENT_ID as string);
					searchParams.set("client_secret", config.CLIENT_SECRET as string);
					searchParams.set("grant_type", "client_credentials");

					const response = await liferay.post("o/oauth2/token", {
						body: searchParams,
					});

					const data = await response.json<any>();

					const authorization = `${data.token_type} ${data.access_token}`;

					cache.set("expires_in", data.expires_in * 1000 + Date.now());
					cache.set("authorization", authorization);

					return request.headers.set("Authorization", authorization);
				}

				console.log({ request, retryCount, error });
			},
		],
	},
	retry: {
		limit: 5,
		methods: ["get", "post"],
		statusCodes: [403, 401],
		backoffLimit: 3000,
	},
});
