const ENV = import.meta.env;

export default {
    extractDatabase: {
        user: ENV.DATABASE_USER,
        password: ENV.DATABASE_PASSWORD,
        host: ENV.DATABASE_HOST,
        port: ENV.DATABASE_PORT,
        database: ENV.DATABASE_NAME,
    },
    download: {
        home: ENV.DOWNLOAD_WEB_ID_URL,
        jsessionid: ENV.DOWNLOAD_WEB_ID_JSESSIONID,
        marketplaceportletpage: ENV.DOWNLOAD_WEB_ID_PORTLETPAGE,
        marketplacecontrolpanelpage: ENV.DOWNLOAD_WEB_ID_CONTROLPANELPAGE,
    },
    CLIENT_ID: ENV.OAUTH_CLIENT_ID,
    CLIENT_SECRET: ENV.OAUTH_CLIENT_SECRET,
    OAUTH_HOST: ENV.OAUTH_HOST,
    SITE_ID: ENV.SITE_ID,
    WEBID: ENV.WEB_ID,
};
