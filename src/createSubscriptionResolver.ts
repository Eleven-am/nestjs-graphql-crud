/**
 * @module createSubscriptionResolver
 * @description Creates a resolver for GraphQL subscriptions
 */

import {SubscriptionResolver, DefaultSubscriptionFilter, DataProvider, FieldSelectionProvider} from "./internalTypes";
import { Inject, Injectable, Type } from "@nestjs/common";
import { firstLetterUppercase } from "./decorators";

/**
 * Creates a subscription resolver class for handling real-time updates
 *
 * @template EntityType - The entity type for the subscription
 *
 * @param {string} modelName - The name of the model
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {symbol} fieldSelectionToken - Symbol for the field selection provider token
 * @param {Type<SubscriptionResolver<EntityType, Type>>} [resolver] - Optional custom resolver implementation
 * @returns {Type<SubscriptionResolver<EntityType, any>>} The subscription resolver class
 */
export function createSubscriptionResolver<
    EntityType,
>(
    modelName: string,
    dataProviderToken: symbol,
    fieldSelectionToken: symbol,
    resolver?: Type<SubscriptionResolver<EntityType, Type>>
): Type<SubscriptionResolver<EntityType, any>> {
    if (resolver) {
        return resolver;
    }

    @Injectable()
    class SubscriptionResolverImpl implements SubscriptionResolver<EntityType, any> {
        constructor(
            @Inject(fieldSelectionToken) readonly fieldSelectionProvider: FieldSelectionProvider,
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
         * @param {any} info - The selection criteria
         * @returns {Promise<EntityType[]>} The resolved entities
         */
        async resolve(filter: DefaultSubscriptionFilter, changes: EntityType[], info: any): Promise<EntityType[]> {
            const select = this.fieldSelectionProvider.parseSelection<EntityType>(info);
            return this.dataProvider.findManyWithoutAbility<EntityType, any>(
                modelName,
                {
                    where: {
                        id: { in: filter.inIds },
                    },
                },
                select as unknown as Record<string, boolean>
            );

        }
    }

    // Give the dynamic class a descriptive name for debugging
    Object.defineProperty(SubscriptionResolverImpl, 'name', {
        value: `${firstLetterUppercase(modelName)}SubscriptionResolver`,
        writable: false,
    });

    return SubscriptionResolverImpl;
}