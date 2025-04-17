/**
 * @module createSubscriptionResolver
 * @description Creates a resolver for GraphQL subscriptions
 */

import { SubscriptionResolver, DefaultSubscriptionFilter, DataProvider } from "./internalTypes";
import { Inject, Injectable, Type } from "@nestjs/common";
import { firstLetterUppercase } from "./decorators";
import { ModuleRef } from "@nestjs/core";

/**
 * Creates a subscription resolver class for handling real-time updates
 *
 * @template EntityType - The entity type for the subscription
 *
 * @param {string} modelName - The name of the model
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {Type<SubscriptionResolver<EntityType, Type>>} [resolver] - Optional custom resolver implementation
 * @returns {Type<SubscriptionResolver<EntityType, any>>} The subscription resolver class
 */
export function createSubscriptionResolver<
    EntityType,
>(
    modelName: string,
    dataProviderToken: symbol,
    resolver?: Type<SubscriptionResolver<EntityType, Type>>
): Type<SubscriptionResolver<EntityType, any>> {
    // If a custom resolver is provided, return it directly
    if (resolver) {
        return resolver;
    }

    @Injectable()
    class SubscriptionResolverImpl implements SubscriptionResolver<EntityType, any> {
        constructor(
            private readonly moduleRef: ModuleRef,
            @Inject(dataProviderToken) private readonly dataProvider: DataProvider
        ) {}

        /**
         * Filter subscription events based on the provided filter
         *
         * @param {DefaultSubscriptionFilter} filter - The subscription filter
         * @param {EntityType[]} changes - The changed entities
         * @returns {boolean} Whether the changes match the filter
         */
        filter(filter: DefaultSubscriptionFilter, changes: EntityType[]): boolean {
            const items = changes as unknown as { id: string }[];
            return filter.inIds.some((id) => items.some((item) => item.id === id));
        }

        /**
         * Resolve entities for subscription updates
         *
         * @param {DefaultSubscriptionFilter} filter - The subscription filter
         * @param {EntityType[]} changes - The changed entities
         * @returns {Promise<EntityType[]>} The resolved entities
         */
        async resolve(filter: DefaultSubscriptionFilter, changes: EntityType[]): Promise<EntityType[]> {
            // For simple ID-based filtering, we can just return the changes directly
            // since they already contain the full entity data
            return changes;
        }
    }

    // Give the dynamic class a descriptive name for debugging
    Object.defineProperty(SubscriptionResolverImpl, 'name', {
        value: `${firstLetterUppercase(modelName)}SubscriptionResolver`,
        writable: false,
    });

    return SubscriptionResolverImpl;
}