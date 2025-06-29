export type APIResponse<T = any> = {
    items: T[];
    lastPage: number;
    page: number;
    totalCount: number;
};

export type Account = {
    company?: string;
    customFields: CustomField[]
    description?: string;
    externalReferenceCode: string;
    id: number;
    logoURL: string
    name: string;
    type?: string;
}

export type PublisherDetails = {
    emailAddress: string;
    location: string;
    publisherName: string;
    websiteURL: string;
    publisherProfileImage: string;
    catalogId: string
    description: string;
    r_accountToPublisherDetails_accountEntryId?: string
}

export type PostalAddress = {
    addressCountry?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    streetAddressLine1?: string;
}

export type Catalog = {
    accountId: number;
    currencyCode: string;
    defaultLanguageId: string;
    externalReferenceCode: string;
    id: number;
    name: string;
    system: true;
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

export type Option = {
    description: {
        en_US: string;
    };
    externalReferenceCode: string;
    facetable: false;
    fieldType: string;
    id: number;
    key: string;
    name: {
        en_US: string;
    };
    required: boolean;
    skuContributor: boolean;
};

export type OptionValue = {
    externalReferenceCode: string;
    id: number;
    key: string;
    name: {
        en_US: string;
    };
    priority: number;
};

export type Vocabulary = {
    description: string;
    id: number;
    name: string;
    numberOfTaxonomyCategories: number;
    siteId: number;
};

export type Product = {
    active?: boolean;
    attachments?: any[];
    catalog?: { accountId: number };
    catalogId: number;
    catalogName?: string;
    categories: {
        id: number;
        name: string;
        vocabulary: string;
    }[];
    customFields?: CustomField[];
    description: {
        en_US: string;
    };
    externalReferenceCode: string;
    id?: number;
    images?: any;
    name: {
        en_US: string;
    };
    productId?: number | string;
    productSpecifications: ProductSpecification[];
    productType: string;
    productVirtualSettings?: {
        id?: number;
        productVirtualSettingsFileEntries?: ProductVirtualSettingsFileEntry[];
    };
    skus?: {
        externalReferenceCode: string;
        sku: string;
    }[];
    thumbnail?: string;
};

type ProductVirtualSettingsFileEntry = {
    src: string;
    version: string;
};

type CustomField = {
    customValue: {
        data: string;
    };
    dataType: string;
    name: string;
};

export type ProductSpecification = {
    id: number;
    key?: string;
    optionCategory?: {
        key: string;
    };
    specificationKey: string;
    value:
    | {
        en_US: string;
    }
    | string;
};

export type ProductOption = {
    catalogId?: string | number;
    description?: string;
    facetable: boolean;
    required: boolean;
    skuContributor: string;
    fieldType: string;
    id?: number;
    key: string;
    name: { en_US: string } | string;
    optionExternalReferenceCode?: string;
    optionId: number | string;
    productOptionValues?: ProductOptionValues[];
};

export type ProductOptionValues = {
    id: number;
    key: string;
    name: string;
    preselected: boolean;
    price: string;
    priceType: string;
    priority: number;
    productOptionId: number;
    quantity: string;
    selectable: boolean;
    unitOfMeasureKey: string;
    visible: boolean;
};

export type Order = {
    account: {
        id: number;
        name: string;
        type: string;
    };
    accountExternalReferenceCode?: string;
    accountId: number;
    billingAddressId?: number;
    channel: {
        currencyCode?: string;
        id: number;
        type: string;
    };
    channelExternalReferenceCode?: string;
    channelId: number;
    createDate?: string;
    creatorEmailAddress?: string;
    currencyCode: string;
    customFields?: { [key: string]: string };
    externalReferenceCode?: string;
    id?: number;
    marketplaceOrderType?: string;
    modifiedDate?: string;
    orderDate?: string;
    orderItems: [
        {
            id?: number;
            name?: {
                en_US: string;
            };
            quantity?: number;
            totalAmount: number;
            skuId: number;
            unitPriceWithTaxAmount?: number;
        }
    ];
    orderStatus: number;
    orderStatusInfo?: {
        label: string;
    };
    orderTypeExternalReferenceCode?: string;
    orderTypeId?: number;
    placedOrderItems?: any;
    shippingAmount?: number;
    shippingWithTaxAmount?: number;
    totalAmount?: number;
};

export type OrderPage = APIResponse<Order>;

export type ProductPage = APIResponse<Product>;
