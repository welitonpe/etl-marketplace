export type APIResponse<T = any> = {
    items: T[];
    page: number;
    lastPage: number;
    totalCount: number;
};

export type ExpiredAttachemnts = {
    CDNEnabled: boolean;
    CDNURL: string;
    CPAttachmentFileEntryId: string;
    classNameId: string;
    classPK: string;
    companyId: string;
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
    externalReferenceCode: string;
    id: number;
    name: { en_US: string };
    categories: {
        id: number;
        name: string;
        vocabulary: string;
    }[];
    productSpecifications: {
        specificationKey: string;
        value: { en_US: string };
    }[];
    thumbnail: string;
    productId: number;
    skus: { externalReferenceCode: string; sku: string }[];
};

export type ProductPage = APIResponse<Product>;
