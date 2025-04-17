/**
 * @module createBaseCrudService
 * @description Creates a service class that implements CRUD operations using a data provider
 */

import { Inject, Injectable, Type } from "@nestjs/common";
import { DataProvider, FindManyContract, IGenericCrudService, SubscriptionAction } from "./internalTypes";
import { firstLetterUppercase } from "./decorators";
import { PubSub } from "graphql-subscriptions";

/**
 * Creates a service class with standard CRUD operations for a specific model
 *
 * @template Item - The entity type this service will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 *
 * @param {string} modelName - The name of the model
 * @param {symbol} pubSubToken - Symbol for the PubSub token used for subscriptions
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @returns {Type} A dynamically generated service class with CRUD operations
 */
export function createBaseCrudService <
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
>
(
    modelName: string,
    pubSubToken: symbol,
    dataProviderToken: symbol,
): Type {
    @Injectable()
    class BaseCrudService implements IGenericCrudService<
        Item,
        CreateInput,
        UpdateInput,
        UpdateManyInput,
        WhereInput
    >{
        constructor(
            @Inject(pubSubToken) private readonly pubSub: PubSub,
            @Inject(dataProviderToken) private readonly dataProvider: DataProvider,
        ) {}

        /**
         * Create a new entity
         *
         * @param {CreateInput} data - The data to create the entity with
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item>} The newly created entity
         */
        async create(data: CreateInput, select: any): Promise<Item> {
            const res = await this.dataProvider.create<Item, CreateInput>(
                modelName,
                data,
                select
            );
            await this.publish(SubscriptionAction.CREATE, res);
            return res;
        }

        /**
         * Delete an entity by ID
         *
         * @param {any} ability - The user's ability for authorization
         * @param {string} whereId - The ID of the entity to delete
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item>} The deleted entity
         */
        async delete(ability: any, whereId: string, select: any): Promise<Item> {
            const res = await this.dataProvider.delete<Item>(
                modelName,
                ability,
                whereId,
                select
            );
            await this.publish(SubscriptionAction.DELETE, res);
            return res;
        }

        /**
         * Delete multiple entities matching criteria
         *
         * @param {any} ability - The user's ability for authorization
         * @param {WhereInput} where - Filter criteria for entities to delete
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item[]>} Array of deleted entities
         */
        async deleteMany(ability: any, where: WhereInput, select: any): Promise<Item[]> {
            const gotDeleted = await this.dataProvider.findMany<Item, WhereInput>(
                modelName,
                ability,
                { where },
                select
            );

            await this.dataProvider.deleteMany<Item, WhereInput>(
                modelName,
                ability,
                where,
                select
            );

            await this.publish(SubscriptionAction.DELETE_MANY, gotDeleted);
            return gotDeleted;
        }

        /**
         * Find multiple entities matching criteria
         *
         * @param {any} ability - The user's ability for authorization
         * @param {FindManyContract<WhereInput>} args - Filter and pagination criteria
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item[]>} Array of matched entities
         */
        async findMany(ability: any, args: FindManyContract<WhereInput>, select: any): Promise<Item[]> {
            return this.dataProvider.findMany<Item, WhereInput>(
                modelName,
                ability,
                {
                    where: args.where || ({} as WhereInput),
                    pagination: args.pagination
                },
                select
            );
        }

        /**
         * Find a single entity by criteria
         *
         * @param {any} ability - The user's ability for authorization
         * @param {WhereInput} where - Filter criteria
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item | null>} The found entity or null
         */
        async findOne(ability: any, where: WhereInput, select: any): Promise<Item | null> {
            return this.dataProvider.findOne<Item, WhereInput>(
                modelName,
                ability,
                where,
                select
            );
        }

        /**
         * Update a single entity by ID
         *
         * @param {any} ability - The user's ability for authorization
         * @param {UpdateInput} data - The data to update
         * @param {string} whereId - The ID of the entity to update
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item>} The updated entity
         */
        async update(ability: any, data: UpdateInput, whereId: string, select: any): Promise<Item> {
            const res = await this.dataProvider.update<Item, UpdateInput>(
                modelName,
                ability,
                data,
                whereId,
                select
            );

            await this.publish(SubscriptionAction.UPDATE, res);
            return res;
        }

        /**
         * Update multiple entities matching criteria
         *
         * @param {any} ability - The user's ability for authorization
         * @param {UpdateManyInput} data - The data to update
         * @param {WhereInput} where - Filter criteria for entities to update
         * @param {any} select - Fields to select in the result
         * @returns {Promise<Item[]>} Array of updated entities
         */
        async updateMany(ability: any, data: UpdateManyInput, where: WhereInput, select: any): Promise<Item[]> {
            const gotUpdated = await this.dataProvider.findMany<Item, WhereInput>(
                modelName,
                ability,
                { where },
                select
            );

            await this.dataProvider.updateMany<Item, UpdateManyInput, WhereInput>(
                modelName,
                ability,
                data,
                where,
                select
            );

            await this.publish(SubscriptionAction.UPDATE_MANY, gotUpdated);
            return gotUpdated;
        }

        /**
         * Publish changes to subscribers
         *
         * @private
         * @param {SubscriptionAction} action - The type of action that occurred
         * @param {any} data - The data to publish
         * @returns {Promise<void>}
         */
        private async publish(action: SubscriptionAction, data: any) {
            const arrayData = Array.isArray(data) ? data : [data];

            await this.pubSub.publish(modelName, {
                action,
                data: arrayData,
            });
        }
    }

    // Give the dynamic class a descriptive name for easier debugging
    Object.defineProperty(BaseCrudService, 'name', {
        value: `${firstLetterUppercase(modelName)}Service`,
        writable: false,
    });

    return BaseCrudService;
}
