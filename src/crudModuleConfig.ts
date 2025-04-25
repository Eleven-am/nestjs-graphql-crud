/**
 * @module crudModuleConfig
 * @description Provides a fluent configuration API for CRUD modules
 */

import {
    CrudModuleOptions,
    CustomResolver,
    Getter,
    OneToManyRelationResolverConfig,
    OneToOneRelationResolverConfig,
    ParametersOfMethod, ParametersOfResolveMethod,
    ReturnTypeOfMethod,
    SubscriptionResolver
} from "./internalTypes";
import {DynamicModule, ForwardReference, Provider, Type} from "@nestjs/common";
import {Permission, WillAuthorize} from "@eleven-am/authorizer";
import {Abstract} from "@nestjs/common/interfaces/abstract.interface";

/**
 * Base Configuration builder for CRUD modules with a fluent API
 *
 * @template Item - The entity type this CRUD module will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 */
export class BaseCrudModuleConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
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
    ) {
        // Initialize resolvers structure if not exists
        if (!this.options.resolvers) {
            this.options.resolvers = {
                relationResolvers: []
            };
        }
    }

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
        if (!this.options.resolvers) {
            this.options.resolvers = {
                relationResolvers: []
            };
        }

        this.options.resolvers.relationResolvers.push(config as any);
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
        if (!this.options.resolvers) {
            this.options.resolvers = {
                relationResolvers: []
            };
        }

        this.options.resolvers.relationResolvers.push({
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
     * Adds custom authorizers to the module
     *
     * @param {...Type<WillAuthorize>[]} authorizer - The authorizer classes to add
     * @returns {this} The configuration builder (for method chaining)
     */
    withAuthorization(...authorizer: Type<WillAuthorize>[]): this {
        return this.withProviders(...authorizer);
    }

    /**
     * Adds imports to the module
     *
     * @param {...(Type | DynamicModule | Promise<DynamicModule> | ForwardReference)[]} imports - The modules to import
     * @returns {this} The configuration builder (for method chaining)
     */
    import(...imports: (Type | DynamicModule | Promise<DynamicModule> | ForwardReference)[]): this {
        if (!this.options.imports) {
            this.options.imports = [];
        }

        this.options.imports.push(...imports);
        return this;
    }

    /**
     * Adds exports to the module
     *
     * @param {...(DynamicModule | string | symbol | Provider | ForwardReference | Abstract<any> | Function)[]} exports - The providers or modules to export
     * @returns {this} The configuration builder (for method chaining)
     */
    export(...exports: (DynamicModule | string | symbol | Provider | ForwardReference | Abstract<any> | Function)[]): this {
        if (!this.options.exports) {
            this.options.exports = [];
        }

        this.options.exports.push(...exports);
        return this;
    }
}

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
    WhereInput
> extends BaseCrudModuleConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
> {
    /**
     * Registers a custom resolver class for this entity
     *
     * @template TResolver The type of the resolver class
     * @param {Type<TResolver>} resolverClass The resolver class that implements custom resolvers
     * @returns {CustomResolverConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput, TResolver>} A CustomResolverConfig instance for chaining specialized resolver methods
     */
    withCustomResolver<TResolver extends object>(
        resolverClass: Type<TResolver>
    ): CustomResolverConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput, TResolver> {
        if (!this.options.resolvers) {
            this.options.resolvers = {
                relationResolvers: []
            };
        }

        // Initialize custom resolvers if not exists
        if (!this.options.resolvers.customResolvers) {
            this.options.resolvers.customResolvers = {
                factoryClass: resolverClass,
                customResolvers: []
            };
        } else {
            this.options.resolvers.customResolvers.factoryClass = resolverClass;
        }

        // Add resolver class to providers
        if (!this.options.providers) {
            this.options.providers = [];
        }
        this.options.providers.push(resolverClass);

        return new CustomResolverConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput, TResolver>(this.options);
    }
}

/**
 * Configuration class for custom resolvers that appears after withCustomResolver is called
 *
 * @template Item - The entity type this CRUD module will manage
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 * @template TResolver - The type of the resolver class
 */
export class CustomResolverConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
    TResolver extends object
> extends BaseCrudModuleConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
> {
    /**
     * Add a custom query to the GraphQL schema
     *
     * @template M Method name in the resolver class
     * @param {Object} config - Configuration for the query
     * @returns {this} The configuration builder (for method chaining)
     */
    addQuery<
        M extends keyof TResolver,
        // Ensure M is a method that returns a Promise
        _ extends TResolver[M] extends (...args: any[]) => Promise<any> ? true : never
    >(
        config: {
            name: string;
            description?: string;
            inputType: Type<ParametersOfMethod<TResolver, M>>;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
        }
    ): this {
        const customConfig: CustomResolver<TResolver, M> = {
            ...config,
            inputType: config.inputType,
            outputType: this.options.entity,
            isMutation: false,
        };

        if (!this.options.resolvers) {
            throw new Error('Custom resolver class not registered');
        }

        if (!this.options.resolvers.customResolvers) {
            throw new Error('Custom resolver class not registered');
        }

        this.options.resolvers.customResolvers.customResolvers.push(customConfig as any);
        return this;
    }

    /**
     * Add a custom mutation to the GraphQL schema
     *
     * @template M Method name in the resolver class
     * @param {Object} config - Configuration for the mutation
     * @returns {this} The configuration builder (for method chaining)
     */
    addMutation<
        M extends keyof TResolver,
        // Ensure M is a method that returns a Promise
        _ extends TResolver[M] extends (...args: any[]) => Promise<any> ? true : never
    >(
        config: {
            name: string;
            description?: string;
            inputType: Type<ParametersOfMethod<TResolver, M>>;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
        }
    ): this {
        const customConfig: CustomResolver<TResolver, M> = {
            ...config,
            inputType: config.inputType,
            outputType: this.options.entity,
            isMutation: true,
        };

        if (!this.options.resolvers) {
            throw new Error('Custom resolver class not registered');
        }

        if (!this.options.resolvers.customResolvers) {
            throw new Error('Custom resolver class not registered');
        }

        this.options.resolvers.customResolvers.customResolvers.push(customConfig as any);
        return this;
    }

    /**
     * Add a field resolver to a type in the GraphQL schema
     *
     * @template M Method name in the resolver class
     * @param {Object} config - Configuration for the field resolver
     * @returns {this} The configuration builder (for method chaining)
     */
    addResolveField<
        M extends keyof TResolver,
        // Ensure M is a method that returns a Promise
        _ extends TResolver[M] extends (...args: any[]) => Promise<any> ? true : never
    >(
        config: {
            name: string;
            description?: string;
            inputType?: Type<ParametersOfResolveMethod<Item, TResolver, M>>;
            outputType: Type;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
            resolveField: string;
        }
    ): this {
        const customConfig: CustomResolver<TResolver, M> = {
            ...config,
            inputType: config.inputType || null as any,
            outputType: config.outputType,
            isMutation: false,
            resolveField: config.resolveField,
        };

        if (!this.options.resolvers) {
            throw new Error('Custom resolver class not registered');
        }

        if (!this.options.resolvers.customResolvers) {
            throw new Error('Custom resolver class not registered');
        }

        this.options.resolvers.customResolvers.customResolvers.push(customConfig as any);
        return this;
    }

    /**
     * Go back to the main config builder
     *
     * @returns {CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>} The main configuration builder
     */
    and(): CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput> {
        return new CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>(this.options);
    }
}
