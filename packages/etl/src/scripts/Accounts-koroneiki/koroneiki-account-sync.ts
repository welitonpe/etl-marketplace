import { koroneikiApi } from '../../services/koroneikiApi';
import api from '../../services/api';
import { Account, DxpUserAccount, KoroneikiAccount } from './types';
import { logger } from '../../utils/logger';
import { liferayClient } from '../../services/liferay';
import { getAccountsPage } from 'liferay-headless-rest-client/headless-admin-user-v1.0';

const accountFilter =
    "entitlements/any(s:contains(s, 'Subscription') or s eq 'Partner')";

class KoroneikAccountSync {
    dxpAccountsFile = `${__dirname}/dxp-accounts.json`
    koroneikiAccountsFile = `${__dirname}/koroneiki-accounts.json`;

    constructor() {
    }

    async createUserAccount() {
        const response = '';
    }

    async createAccount({
        externalReferenceCode,
        name,
        type,
    }: {
        externalReferenceCode: string;
        name: string;
        type: string;
    }) {
        const response = await api.createAccount({
            externalReferenceCode,
            name,
            type,
        });

        return await response.json();
    }

    async fetchAccountsDXP() {
        const response = await api.getAccounts();
    }

    async getDXPAccounts(page: number, pageSize: number) {
        const response = await getAccountsPage({
            client: liferayClient,
            query: {
                nestedFields: 'customFields,postalAddresses,userAccount',
                page: page.toString(),
                pageSize: pageSize.toString(),
            },
        });

        await Bun.write(
            './packages/etl/src/scripts/Accounts-koroneiki/dxp-accounts.json',
            JSON.stringify(response, null, 2),
        );

    }

    async getkoroneikAccounts(filters?: string) {
        const response = await koroneikiApi.getKoroneikiAccounts(filters);
        let items = []

        for (const item of response.items) {
            let address = item?.postalAddresses
                ? [...item.postalAddresses]
                : [];

            if (!address.length) {
                const addressResponse =
                    await koroneikiApi.getKoroneikiPostalAddress(item.key);

                address = addressResponse.items;
            }

            items.push({
                address,
                contactEmailAddress: item.contactEmailAddress,
                externalReferenceCode: item.key,
                name: item.name,
                type: 'business',
            });
        }

        await Bun.write(
            './packages/etl/src/scripts/Accounts-koroneiki/koroneiki-accounts.json',
            JSON.stringify(items, null, 2),
        );

        return items;
    }

    parseNameForUserAccount(fullName: string): {
        givenName: string;
        familyName: string;
    } {
        const nameParts = fullName.trim().split(' ');

        if (nameParts.length === 1) {
            return {
                givenName: nameParts[0],
                familyName: 'Default',
            };
        }

        return {
            givenName: nameParts[0],
            familyName: nameParts.slice(1).join(' '),
        };
    }

    async addUserToAccount(koroneikiAccount: KoroneikiAccount, dxpAccountId: number) {
        const { givenName, familyName } = this.parseNameForUserAccount(
            koroneikiAccount.name,
        );

        return await api.addUserToAccount(dxpAccountId, {
            emailAddress: koroneikiAccount.contactEmailAddress,
            givenName,
            familyName,
            alternateName: koroneikiAccount.name,
            externalReferenceCode: koroneikiAccount.externalReferenceCode,
        });
    }

    async createAndLinkUserAccount(
        koroneikiAccount: KoroneikiAccount,
        dxpAccountId: number | any,
    ): Promise<DxpUserAccount | null> {

        const { givenName, familyName } = this.parseNameForUserAccount(
            koroneikiAccount.name,
        );

        const userAccountData = {
            emailAddress: koroneikiAccount.contactEmailAddress,
            givenName,
            familyName,
            alternateName: koroneikiAccount.name,
            externalReferenceCode: koroneikiAccount.externalReferenceCode,
        };

        const response = await api.createUserAccount(userAccountData);
        const newUser = (await response.json()) as DxpUserAccount;

        logger.info(
            `Vinculando novo UserAccount ${newUser.emailAddress} à Account ${dxpAccountId}`,
        );

        await this.addUserToAccount(koroneikiAccount, dxpAccountId)

        return newUser
    }

    async findDxpUserAccountByEmail(
        email: string,
    ): Promise<DxpUserAccount | null> {
        try {
            const searchParams = new URLSearchParams();
            searchParams.set('filter', `emailAddress eq '${email}'`);

            const response = await api.getUserAccounts(searchParams);
            const data = (await response.json()) as any;

            if (data.items && data.items.length > 0) {
                return data.items[0];
            }

            return null;
        } catch (error: any) {
            logger.error(
                `Erro ao buscar UserAccount por email ${email}:`,
                error,
            );
            return null;
        }
    }

    async loadFile<T>(file: string, type: string): Promise<T[]> {
        try {
            const content = await Bun.file(file).text();

            return JSON.parse(content);

        } catch (error: any) {
            logger.error(`Erro ao carregar arquivo de accounts ${type}:`, error);

            return [];
        }
    }

    async loadDxpAccounts(): Promise<Account[]> {
        try {
            const content = await Bun.file(this.dxpAccountsFile).text();

            return JSON.parse(content);

        } catch (error: any) {
            logger.error('Erro ao carregar arquivo de accounts DXP:', error);

            return [];
        }
    }

    async loadKoroneikiAccounts(): Promise<KoroneikiAccount[]> {
        try {
            const content = await Bun.file(this.koroneikiAccountsFile).text();

            return JSON.parse(content);

        } catch (error: any) {
            logger.error(
                'Erro ao carregar arquivo de accounts Koroneiki:',
                error,
            );

            return [];
        }
    }



    async main() {
        await this.getkoroneikAccounts(accountFilter);
        await this.getDXPAccounts(1, 100)

        let dxpAccounts = await this.loadFile(this.dxpAccountsFile, 'dxp');
        console.log("🚀 ~ KoroneikAccountSync ~ main ~ dxpAccounts:", dxpAccounts)

        let koroneikiAccounts = await this.loadFile(this.koroneikiAccountsFile, 'Koroneiki');
        console.log("🚀 ~ KoroneikAccountSync ~ main ~ koroneikiAccounts:", koroneikiAccounts)

        for (const account of koroneikiAccounts) {
            console.log("🚀 ~ KoroneikAccountSync ~ main ~ account:", account.contactEmailAddress)
            const createdDxpAccount = await this.createAccount({
                name: account.name,
                externalReferenceCode: account.externalReferenceCode,
                type: 'business',
            });

            const createdDxpAccountId = (createdDxpAccount as any).id as number

            await this.createAndLinkUserAccount(account, createdDxpAccountId)
        }
    }
}

const test = new KoroneikAccountSync();

test.main();


