/**
 * @module crudModuleConfig
 * @description Provides a fluent configuration API for CRUD modules
 */

import {
    CrudModuleOptions,
    CustomResolverConfig,
    OneToManyRelationResolverConfig,
    OneToOneRelationResolverConfig,
    SubscriptionResolver,
} from "./internalTypes";
import { DynamicModule, ForwardReference, Provider, Type } from "@nestjs/common";
import { WillAuthorize } from "@eleven-am/authorizer";
import { Abstract } from "@nestjs/common/interfaces/abstract.interface";

/**
 * Configuration builder for CRUD modules with a fluent API
 *
 * @template Item - The entity type this CRUD module will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 */
export class CrudModuleConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
> {
    /**
     * Create a new CRUD module configuration
     *
     * @param {CrudModuleOptions<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} options - Initial configuration options
     */
    constructor(
        public readonly options: CrudModuleOptions<
            Item,
            CreateInput,
            UpdateInput,
            UpdateManyInput,
            WhereInput
        >
    ) {}

    /**
     * Adds a one-to-many relation resolver to the module
     *
     * @template Target - The related entity type
     * @template TargetWhereInput - The input type for filtering related entities
     *
     * @param {OneToManyRelationResolverConfig<Target, TargetWhereInput>} config - Configuration for the relation resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    addRelation<Target, TargetWhereInput>(
        config: OneToManyRelationResolverConfig<Target, TargetWhereInput>
    ): this {
        if (!this.options.relationResolvers) {
            this.options.relationResolvers = [];
        }

        this.options.relationResolvers.push(config as any);
        return this;
    }

    /**
     * Adds a custom relation resolver to the module (returns a single entity)
     *
     * @template Target - The related entity type
     * @template TargetWhereInput - The input type for filtering related entities
     *
     * @param {Omit<CustomResolverConfig<Item, Target, TargetWhereInput>, 'isMany'>} config - Configuration for the custom relation resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    addCustomRelation<Target, TargetWhereInput>(
        config: Omit<CustomResolverConfig<Item, Target, TargetWhereInput>, 'isMany'>
    ): this {
        if (!this.options.relationResolvers) {
            this.options.relationResolvers = [];
        }

        this.options.relationResolvers.push({
            ...config,
            isMany: false
        } as any);
        return this;
    }

    /**
     * Adds a custom relation resolver that returns an array of entities
     *
     * @template Target - The related entity type
     * @template TargetWhereInput - The input type for filtering related entities
     *
     * @param {Omit<CustomResolverConfig<Item, Target[], TargetWhereInput>, 'isMany' | 'targetType'> & { targetType: Type<Target> }} config - Configuration for the custom array relation resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    addCustomArrayRelation<Target, TargetWhereInput>(
        config: Omit<CustomResolverConfig<Item, Target[], TargetWhereInput>, 'isMany' | 'targetType'> & {
            targetType: Type<Target>;
        }
    ): this {
        if (!this.options.relationResolvers) {
            this.options.relationResolvers = [];
        }

        this.options.relationResolvers.push({
            ...config,
            isMany: true
        } as any);
        return this;
    }

    /**
     * Adds a one-to-one relation resolver to the module
     *
     * @template Target - The related entity type
     *
     * @param {Omit<OneToOneRelationResolverConfig<Item, Target>, 'oneToOneRelation'>} config - Configuration for the one-to-one relation resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    addOneToOneRelation<Target>(
        config: Omit<OneToOneRelationResolverConfig<Item, Target>, 'oneToOneRelation'>
    ): this {
        if (!this.options.relationResolvers) {
            this.options.relationResolvers = [];
        }

        this.options.relationResolvers.push({
            ...config,
            oneToOneRelation: true
        } as any);
        return this;
    }

    /**
     * Adds a custom subscription resolver to the module
     *
     * @template FilterType - The filter type for subscriptions
     *
     * @param {{ filter: Type<FilterType>; resolver: Type<SubscriptionResolver<Item, FilterType>> }} config - Configuration for the subscription resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    withSubscription<FilterType>(config: {
        filter: Type<FilterType>;
        resolver: Type<SubscriptionResolver<Item, FilterType>>;
    }): this {
        this.options.subscriptionResolver = config;
        return this;
    }

    /**
     * Adds a custom authorizer to the module
     *
     * @template WillAuthorize - The authorizer type
     *
     * @param {Type<WillAuthorize>[]} authorizers - The authorizer class
     */
    withAuthorizations(...authorizers: Type<WillAuthorize>[]) {
       return this.withProviders(...authorizers);
    }

    /**
     * Adds custom providers to the module
     *
     * @param {...Type[]} providers - The provider classes to add
     * @returns {this} The configuration builder (for method chaining)
     */
    withProviders(...providers: Type[]): this {
        if (!this.options.providers) {
            this.options.providers = [];
        }

        this.options.providers.push(...providers);
        return this;
    }

    /**
     * Adds custom controllers to the module
     *
     * @param {...Type[]} controllers - The controller classes to add
     * @returns {this} The configuration builder (for method chaining)
     */
    withControllers(...controllers: Type[]): this {
        if (!this.options.controllers) {
            this.options.controllers = [];
        }

        this.options.controllers.push(...controllers);
        return this;
    }

    /**
     * Adds imports to the module. This is useful for importing other modules that provide additional functionalities.
     * @param imports An array of NestJS modules to be imported into this module.
     */
    import(...imports: (Type<any> | DynamicModule | Promise<DynamicModule> | ForwardReference)[]): this {
        if (!this.options.imports) {
            this.options.imports = [];
        }

        this.options.imports.push(...imports);
        return this;
    }

    /**
     * Adds exports to the module. This is useful for exporting providers or modules for use in other modules.
     * @param exports An array of NestJS providers or modules to be exported from this module.
     */
    export (...exports: (DynamicModule | string | symbol | Provider | ForwardReference | Abstract<any> | Function)[]): this{
        if (!this.options.exports) {
            this.options.exports = [];
        }

        this.options.exports.push(...exports);
        return this;
    }
}
