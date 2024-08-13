export type APIResponse<T = any> = {
    items: T[];
    lastPage: number;
    page: number;
    totalCount: number;
};

export type ExpiredAttachemnts = {
    CDNEnabled: boolean;
    CDNURL: string;
    classNameId: string;
    classPK: string;
    companyId: string;
    CPAttachmentFileEntryId: string;
    createDate: number;
    ctCollectionId: string;
    displayDate: number;
    expirationDate: number;
    externalReferenceCode: string;
    fileEntryId: string;
    galleryEnabled: boolean;
    groupId: string;
    json: string;
    lastPublishDate?: any;
    modifiedDate: number;
    mvccVersion: string;
    priority: number;
    status: number;
    statusByUserId: string;
    statusByUserName: string;
    statusDate: number;
    title: string;
    titleCurrentValue: string;
    type: number;
    userId: string;
    userName: string;
    uuid: string;
};

export type Product = {
    catalog: { accountId: number };
    categories: {
        id: number;
        name: string;
        vocabulary: string;
    }[];
    externalReferenceCode: string;
    id: number;
    name: {
        en_US: string;
    };
    productId: number;
    productSpecifications: ProductSpecifications[];
    productVirtualSettings: {
        id: number;
        productVirtualSettingsFileEntries: ProductVirtualSettingsFileEntry[];
    };
    skus: {
        externalReferenceCode: string;
        sku: string;
    }[];
    thumbnail: string;
};

type ProductVirtualSettingsFileEntry = {
    src: string;
    version: string;
};

export type ProductSpecifications = {
    id: number;
    key: string;
    optionCategory: {
        key: string;
    };
    specificationKey: string;
    value: {
        en_US: string;
    };
};

export type ProductPage = APIResponse<Product>;
