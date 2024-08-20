export type APIResponse<T = any> = {
	items: T[];
	lastPage: number;
	page: number;
	totalCount: number;
};

export type Catalog = {
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
	attachments: any[];
	catalog: { accountId: number };
	categories: {
		id: number;
		name: string;
		vocabulary: string;
	}[];
	customFields?: CustomField[];
	externalReferenceCode: string;
	id: number;
	images: any;
	name: {
		en_US: string;
	};
	productId: number | string;
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

type CustomField = {
	customValue: {
		data: string;
	};
	dataType: string;
	name: string;
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
