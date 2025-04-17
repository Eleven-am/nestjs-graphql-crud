/**
 * @module createBaseCrudModule
 * @description Creates a dynamically generated NestJS module with CRUD operations for a specific model
 */

import { CrudModuleOptions, UserSubscriptionFilter } from "./internalTypes";
import { createBaseCrudService } from "./createBaseCrudService";
import { DynamicModule, Provider } from "@nestjs/common";
import { createBaseCrudResolver } from "./createBaseCrudResolver";
import { firstLetterUppercase } from "./decorators";
import { createCombinedRelationResolverClass } from "./createCombinedRelationResolverClass";
import { createSubscriptionResolver } from "./createSubscriptionResolver";

/**
 * Creates a NestJS dynamic module that provides CRUD operations for a specific model
 *
 * @template Item - The entity type this CRUD module will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 *
 * @param {symbol} pubSubToken - Symbol for the PubSub token used for subscriptions
 * @param {symbol} dataProviderToken - Symbol for the data provider token
 * @param {symbol} fieldSelectionProviderToken - Symbol for the field selection provider token
 * @param {CrudModuleOptions<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} options - Configuration options for the CRUD module
 * @returns {DynamicModule} A dynamically generated NestJS module with CRUD capabilities
 */
export function createBaseCrudModule <
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
>(
    pubSubToken: symbol,
    dataProviderToken: symbol,
    fieldSelectionProviderToken: symbol,
    options: CrudModuleOptions<
        Item,
        CreateInput,
        UpdateInput,
        UpdateManyInput,
        WhereInput
    >
): DynamicModule {
    const SubscriptionFilter = options.subscriptionResolver?.filter ?? UserSubscriptionFilter;

    const serviceToken = Symbol(`${options.modelName}Service`);
    const subscriptionResolversToken = Symbol(`${options.modelName}SubscriptionResolvers`);

    // Create the service
    const BaseCrudService = createBaseCrudService(
        options.modelName,
        pubSubToken,
        dataProviderToken
    );

    // Create the resolver
    const BaseCrudResolver = createBaseCrudResolver(
        pubSubToken,
        serviceToken,
        subscriptionResolversToken,
        fieldSelectionProviderToken,
        SubscriptionFilter,
        options
    );

    // Create the subscription resolver
    const ResolverService = createSubscriptionResolver(
        options.modelName,
        dataProviderToken,
        options.subscriptionResolver?.resolver
    );

    // Create providers
    const BaseCrudServiceProvider: Provider = { provide: serviceToken, useClass: BaseCrudService };
    const SubscriptionResolverProvider: Provider = { provide: subscriptionResolversToken, useClass: ResolverService };

    // Create the relation resolver
    const RelationResolver = createCombinedRelationResolverClass(
        options.modelName,
        options.entity,
        dataProviderToken,
        fieldSelectionProviderToken,
        options.relationResolvers || []
    );

    const CustomResolverFactories = (options.relationResolvers ?? [])
        .filter(config => 'factoryClass' in config)
        .map(config => config.factoryClass);

    class BaseCrudModule {
        /**
         * Creates and configures the CRUD module with all necessary providers
         *
         * @returns {DynamicModule} Configured NestJS module
         */
        static forRoot(): DynamicModule {
            return {
                global: true,
                module: BaseCrudModule,
                providers: [
                    BaseCrudResolver,
                    RelationResolver,
                    BaseCrudServiceProvider,
                    SubscriptionResolverProvider,
                    ...CustomResolverFactories,
                    ...(options.authorizer ? [options.authorizer] : []),
                ],
            };
        }
    }

    // Give the dynamic class a descriptive name for easier debugging
    Object.defineProperty(BaseCrudModule, 'name', {
        value: `${firstLetterUppercase(options.modelName)}Module`,
        writable: false,
    });

    return BaseCrudModule.forRoot();
}