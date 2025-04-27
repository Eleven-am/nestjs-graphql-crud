// index.d.ts (Updated Version with Custom Resolver Support)

import {DynamicModule, ForwardReference, Provider, Type} from '@nestjs/common';
import {GraphQLResolveInfo} from 'graphql';
import {AppAbilityType, Permission, WillAuthorize} from '@eleven-am/authorizer';
import {PrismaClient} from '@prisma/client';
import {Abstract} from "@nestjs/common/interfaces/abstract.interface";

/**
 * A function type that returns the value when called.
 * Used for lazy evaluation of types to avoid circular dependencies.
 */
export type Getter<T> = () => T;

/**
 * Type helper to extract parameter types from a method.
 * Specifically designed to extract the first argument from methods with the
 * signature (arg1: T, ability: AppAbilityType, select: any).
 */
export type ParametersOfMethod<Target, Method extends keyof Target> = Target[Method] extends (...args: any[]) => any
    ? Parameters<Target[Method]> extends [infer Argument, AppAbilityType, any] ? Argument : never
    : never;

export type ParametersOfResolveMethod<Item, Target, Method extends keyof Target> = Target[Method] extends (...args: any[]) => any
    ? Parameters<Target[Method]> extends [infer Argument, AppAbilityType, Item, any] ? Argument : never
    : never;

/**
 * Type helper to extract a return type from a method.
 */
export type ReturnTypeOfMethod<Target, Method extends keyof Target> = Target[Method] extends (...args: any[]) => any
    ? ReturnType<Target[Method]>
    : never;

/**
 * Interface for FindMany query parameters
 *
 * @template WhereInput - The type of the where input
 */
export declare class FindManyContract<WhereInput> {
    /** Filter criteria */
    where?: WhereInput;
    /** Pagination parameters */
    pagination?: PaginationContract;
}

/**
 * Defines the structure for pagination arguments.
 * Used within operations that retrieve lists of entities.
 */
export interface PaginationContract {
    /** Maximum number of records to return (e.g., page size). */
    take: number;
    /** Number of records to skip (e.g., for offset pagination). */
    skip: number;
}

/**
 * Represents the result of parsing GraphQL field selections.
 * This structure can be used by DataProvider implementations to optimize data fetching
 * by selecting only the necessary fields.
 * @template EntityType The entity type whose fields are being selected.
 */
export interface FieldSelectionResult<EntityType> {
    /**
     * A nested structure indicating which fields were requested.
     * `true` indicates a scalar or enum field.
     * A nested object indicates relation fields, recursively defining selections within the relation.
     */
    select: {
        [K in keyof EntityType]?: EntityType[K] extends Array<infer U> ?
            (U extends object ? FieldSelectionResult<U> : boolean) : // Handle arrays of objects vs arrays of scalars
            EntityType[K] extends object ?
                FieldSelectionResult<EntityType[K]> : // Handle nested objects
                boolean; // Handle scalar fields
    };
}

/**
 * Interface for a service that can parse GraphQL query info (`GraphQLResolveInfo`)
 * to determine the specific fields requested by a client.
 * Implement this interface to provide logic for understanding field selections,
 * typically used to optimize database queries within a `DataProvider`.
 */
export interface FieldSelectionProvider {
    /**
     * Parses the GraphQL resolver info to extract the requested fields.
     * @param info The `GraphQLResolveInfo` object provided by the GraphQL execution engine.
     * @returns A structured representation (`FieldSelectionResult`) of the selected fields.
     * @template EntityType The entity type being queried.
     */
    parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType>;
}

/**
 * Interface defining the contract for data persistence operations (CRUD).
 * This is a crucial interface to implement for connecting the library to a specific
 * database or ORM (e.g., Prisma, TypeORM). Implementations handle the actual
 * data fetching and manipulation, often integrating authorization checks.
 */
export interface DataProvider {
    /**
     * Finds a single entity matching the given criteria, respecting authorization rules.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param where The filter criteria used to find the specific entity.
     * @param select A structure indicating which fields of the entity should be returned.
     * @returns A promise resolving to the found entity object or null if not found or not permitted.
     * @template EntityType The type of the entity being queried.
     * @template WhereInputType The type defining the filter criteria.
     */
    findOne<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType | null>;

    /**
     * Finds multiple entities matching the given criteria, respecting authorization and pagination.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param args An object containing filter criteria (`where`), optional pagination (`pagination`), and optional sorting (`orderBy`).
     * @param select A structure indicating which fields should be returned for each entity.
     * @returns A promise resolving to an array of found entities.
     * @template EntityType The type of the entity being queried.
     * @template WhereInputType The type defining the filter criteria.
     */
    findMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, args: {
        where: WhereInputType;
        pagination?: PaginationContract;
        orderBy?: Record<string, 'asc' | 'desc'>;
    }, select: Record<string, boolean>): Promise<EntityType[]>;

    /**
     * Creates a new entity with the given data. Authorization for creation might be handled
     * separately or assumed before calling this method.
     * @param modelName The logical name or identifier of the data model/table.
     * @param data The data object for the new entity.
     * @param select A structure indicating which fields of the newly created entity should be returned.
     * @returns A promise resolving to the newly created entity object.
     * @template EntityType The type of the entity being created.
     * @template CreateInputType The type defining the input data for creation.
     */
    create<EntityType, CreateInputType>(modelName: string, data: CreateInputType, select: Record<string, boolean>): Promise<EntityType>;

    /**
     * Updates a single entity identified by its ID, respecting authorization rules.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param data The data object containing the fields to update.
     * @param whereId The unique identifier (usually ID) of the entity to update.
     * @param select A structure indicating which fields of the updated entity should be returned.
     * @returns A promise resolving to the updated entity object.
     * @template EntityType The type of the entity being updated.
     * @template UpdateInputType The type defining the input data for updates.
     */
    update<EntityType, UpdateInputType>(modelName: string, ability: AppAbilityType, data: UpdateInputType, whereId: string, select: Record<string, boolean>): Promise<EntityType>;

    /**
     * Updates multiple entities matching the given criteria, respecting authorization rules.
     * Note: The capability to return the updated entities might depend on the underlying ORM.
     * Implementations might need to pre-fetch IDs or re-fetch data if the ORM doesn't support returning updated records directly.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param data The data object containing the fields to apply to the matched entities.
     * @param where The filter criteria to identify the entities to update.
     * @param select A structure indicating which fields should be returned (may require complex implementation).
     * @returns A promise resolving to an array of updated entity objects (implementation might vary).
     * @template EntityType The type of the entity being updated.
     * @template UpdateInputType The type defining the input data for updates.
     * @template WhereInputType The type defining the filter criteria.
     */
    updateMany<EntityType, UpdateInputType, WhereInputType>(modelName: string, ability: AppAbilityType, data: UpdateInputType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType[]>;

    /**
     * Deletes a single entity identified by its ID, respecting authorization rules.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param whereId The unique identifier (usually ID) of the entity to delete.
     * @param select A structure indicating which fields of the deleted entity should be returned.
     * @returns A promise resolving to the deleted entity object.
     * @template EntityType The type of the entity being deleted.
     */
    delete<EntityType>(modelName: string, ability: AppAbilityType, whereId: string, select: Record<string, boolean>): Promise<EntityType>;

    /**
     * Deletes multiple entities matching the given criteria, respecting authorization rules.
     * Note: The capability to return the deleted entities might depend on the underlying ORM.
     * Implementations might need to pre-fetch matching entities before deletion.
     * @param modelName The logical name or identifier of the data model/table.
     * @param ability The authorization ability object for the current user/request context.
     * @param where The filter criteria to identify the entities to delete.
     * @param select A structure indicating which fields should be returned (may require pre-fetching).
     * @returns A promise resolving to an array of deleted entity objects (implementation might vary).
     * @template EntityType The type of the entity being deleted.
     * @template WhereInputType The type defining the filter criteria.
     */
    deleteMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType[]>;
}

/**
 * Interface defining the contract for filtering and resolving GraphQL subscription updates.
 * Implement this interface to provide custom logic for how subscription events generated
 * by the CRUD service are filtered for specific clients and how the final payload is shaped.
 * Used with `CrudModuleConfig.withSubscription`.
 *
 * @template EntityType The entity type being tracked by the subscription.
 * @template FilterType The type defining the filter criteria provided by the client when subscribing.
 */
export interface SubscriptionResolver<EntityType, FilterType> {
    /**
     * Determines if a specific subscriber, based on their filter criteria,
     * should receive the notification about the given changes.
     * @param filter The filter criteria provided by the specific subscriber.
     * @param changes An array of entities that have changed (created, updated, or deleted) and triggered the event.
     * @returns `true` if the subscriber should receive the update based on their filter, `false` otherwise.
     */
    filter(filter: FilterType, changes: EntityType[]): boolean;

    /**
     * Processes or transforms the changed entities before sending them to the subscriber.
     * This method is called only if `filter` returns `true`. It can be used to fetch additional data,
     * shape the output according to the client's needs, or perform other transformations.
     * @param filter The filter criteria provided by the specific subscriber.
     * @param changes An array of entities that have changed and passed the `filter` check.
     * @param select The selection criteria indicating which fields should be included in the response.
     * @returns A promise resolving to the array of entities (potentially transformed) to be sent to the subscriber.
     */
    resolve(filter: FilterType, changes: EntityType[], select: any): Promise<EntityType[]>;
}

/**
 * A generic constructor type representing a class constructor.
 * @template Class The class type.
 * @template Parameters The types of the constructor parameters.
 */
export type Constructor<Class, Parameters extends any[] = any[]> = new (...args: Parameters) => Class;

/**
 * Defines the configuration for resolving a standard one-to-many relationship
 * (e.g., a User has many Posts, where Post has a `userId` field).
 * Used as input for `CrudModuleConfig.addRelation`.
 *
 * @template Target The related entity type (the "many" side, e.g., `Post`).
 * @template WhereInput Input type for filtering the related entities (e.g., `PostWhereInput`).
 */
export interface OneToManyRelationResolverConfig<Target, WhereInput> {
    /** The name of the field in the GraphQL schema representing this relation (e.g., "posts"). */
    fieldName: string;
    /** The logical name or identifier of the related model (e.g., Prisma model name "post"). */
    targetModel: string;
    /** Optional input type class used for filtering related entities in the GraphQL query. */
    targetWhereInput?: Type<WhereInput>;
    /** The class representing the related entity type (e.g., `Post`). */
    targetType: Type<Target>;
    /** Whether the filter argument (`targetWhereInput`) is nullable in the GraphQL schema. */
    whereNullable: boolean;
    /** The name of the field on the related entity (`Target`) that holds the foreign key referencing the parent entity's ID (e.g., "userId" on the `Post` entity). */
    relationField: keyof Target & string;
}

/**
 * Interface for a one-to-one relation configuration.
 * Used to define relationships where one entity relates to exactly one instance of another entity.
 *
 * @template Item The parent entity type
 * @template Target The related entity type
 */
export interface OneToOneRelationResolverConfig<Item, Target> {
    /** The name of the field in the GraphQL schema */
    fieldName: string;
    /** The name of the target model */
    targetModel: string;
    /** The class representing the target entity */
    targetType: Type<Target>;
    /** The name of the field on the parent entity that holds the foreign key */
    relationField: keyof Item;
    /** Whether the relation field is nullable */
    nullable?: boolean;
}

/**
 * Base configuration builder for CRUD modules with common functionality.
 *
 * @template Item The entity type
 * @template CreateInput The input type for create operations
 * @template UpdateInput The input type for update operations
 * @template UpdateManyInput The input type for update many operations
 * @template WhereInput The input type for query filters
 */
export declare class BaseCrudModuleConfig<
    Item,
> {
    /**
     * Adds a one-to-many relation resolver to the module.
     *
     * @template Target The related entity type
     * @template TargetWhereInput The input type for filtering related entities
     * @param config Configuration for the one-to-many relation resolver
     * @returns The configuration builder for chaining
     */
    addRelation<Target, TargetWhereInput>(
        config: OneToManyRelationResolverConfig<Target, TargetWhereInput>
    ): this;

    /**
     * Adds a one-to-one relation resolver to the module.
     *
     * @template Target The related entity type
     * @param config Configuration for the one-to-one relation resolver
     * @returns The configuration builder for chaining
     */
    addOneToOneRelation<Target>(
        config: OneToOneRelationResolverConfig<Item, Target>
    ): this;

    /**
     * Adds a custom subscription resolver to the module.
     *
     * @template FilterType The filter type for subscriptions
     * @param config Configuration for the subscription resolver
     * @returns The configuration builder for chaining
     */
    withSubscription<FilterType>(config: {
        filter: Type<FilterType>;
        resolver: Type<SubscriptionResolver<Item, FilterType>>;
    }): this;

    /**
     * Adds custom providers to the module.
     *
     * @param providers The provider classes to add
     * @returns The configuration builder for chaining
     */
    withProviders(...providers: Type[]): this;

    /**
     * Adds custom controllers to the module.
     *
     * @param controllers The controller classes to add
     * @returns The configuration builder for chaining
     */
    withControllers(...controllers: Type[]): this;

    /**
     * Adds custom authorizers to the module
     *
     * @param {...Type<WillAuthorize>[]} authorizer - The authorizer classes to add
     * @returns {this} The configuration builder (for method chaining)
     */
    withAuthorization(...authorizer: Type<WillAuthorize>[]): this;

    /**
     * Adds imports to the module.
     *
     * @param imports The modules to import
     * @returns The configuration builder for chaining
     */
    import(...imports: (Type | DynamicModule | Promise<DynamicModule> | ForwardReference)[]): this;

    /**
     * Adds exports to the module.
     *
     * @param exports The providers or modules to export
     * @returns The configuration builder for chaining
     */
    export(...exports: (DynamicModule | string | symbol | Provider | ForwardReference | Abstract<any> | Function)[]): this;
}

/**
 * Main configuration builder for CRUD modules with a fluent API.
 * Inherits common functionality from BaseCrudModuleConfig and adds custom resolver support.
 *
 * @template Item The entity type
 * @template CreateInput The input type for create operations
 * @template UpdateInput The input type for update operations
 * @template UpdateManyInput The input type for update many operations
 * @template WhereInput The input type for query filters
 */
export declare class CrudModuleConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
> extends BaseCrudModuleConfig<Item> {
    /**
     * Registers a custom resolver class for this entity.
     * This method changes the configuration API to allow adding specific resolver types.
     *
     * @template TResolver The type of the resolver class
     * @param resolverClass The resolver class that implements custom resolvers
     * @returns A CustomResolverConfig instance for chaining specialized resolver methods
     */
    withCustomResolver<TResolver extends object>(
        resolverClass: Type<TResolver>
    ): CustomResolverConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput, TResolver>;
}

/**
 * Configuration class for custom resolvers.
 * Appears after withCustomResolver is called and provides methods for mapping resolver methods.
 *
 * @template Item The entity type
 * @template CreateInput The input type for create operations
 * @template UpdateInput The input type for update operations
 * @template UpdateManyInput The input type for update many operations
 * @template WhereInput The input type for query filters
 * @template TResolver The type of the resolver class
 */
export declare class CustomResolverConfig<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
    TResolver extends object
> extends BaseCrudModuleConfig<Item> {
    /**
     * Add a custom query to the GraphQL schema.
     * Maps a method on the resolver class to a GraphQL query.
     *
     * @template M Method name in the resolver class
     * @param config Configuration for the query
     * @returns The configuration builder for chaining
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
            outputType: Getter<Type<Awaited<ReturnTypeOfMethod<TResolver, M>>>>;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
        }
    ): this;

    /**
     * Add a custom mutation to the GraphQL schema.
     * Maps a method on the resolver class to a GraphQL mutation.
     *
     * @template M Method name in the resolver class
     * @param config Configuration for the mutation
     * @returns The configuration builder for chaining
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
            outputType: Getter<Type<Awaited<ReturnTypeOfMethod<TResolver, M>>>>;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
        }
    ): this;

    /**
     * Add a field resolver to a type in the GraphQL schema.
     * Maps a method on the resolver class to a GraphQL field resolver.
     *
     * @template M Method name in the resolver class
     * @param config Configuration for the field resolver
     * @returns The configuration builder for chaining
     */
    addResolveField<
        M extends keyof TResolver,
        // Ensure M is a method that returns a Promise
        _ extends TResolver[M] extends (...args: any[]) => Promise<any> ? true : never
    >(
        config: {
            name: string;
            description?: string;
            inputType: Type<ParametersOfResolveMethod<Item, TResolver, M>>;
            outputType: Getter<Type<Awaited<ReturnTypeOfMethod<TResolver, M>>>>;
            nullable?: boolean;
            methodName: M & string;
            permissions: Permission[];
            resolveField: string;
        }
    ): this;

    /**
     * Go back to the main config builder.
     * Provides a way to return to the main CrudModuleConfig after adding custom resolvers.
     *
     * @returns The main CrudModuleConfig instance
     */
    and(): CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>;
}

/**
 * Factory class for creating and registering all CRUD modules based on provided configurations.
 * This is the main entry point for integrating the library into a NestJS application.
 *
 * @example
 * ```typescript
 * // In your NestJS module (e.g., app.module.ts)
 * @Module({
 * imports: [
 *   // 1. Specify global providers (DataProvider, FieldSelectionProvider)
 *   CrudModulesFactory
 *     .using(MyPrismaDataProvider, MyPrismaFieldSelectionProvider)
 *     // 2. Provide configurations for all desired entities
 *     .forRoot([
 *       // Configure the 'User' entity
 *       CrudModulesFactory
 *         .forEntity(User)
 *         .withConfig({
 *           modelName: 'user',
 *           createInput: UserCreateInput,
 *           updateInput: UserUpdateInput,
 *           updateManyInput: UserUpdateManyInput,
 *           whereInput: UserWhereInput,
 *         })
 *         // Add one-to-many relation
 *         .addRelation<Post, PostWhereInput>({
 *           fieldName: 'posts',
 *           targetModel: 'post',
 *           targetType: Post,
 *           targetWhereInput: PostWhereInput,
 *           whereNullable: true,
 *           relationField: 'authorId'
 *         })
 *         // Add custom resolvers
 *         .withCustomResolver(UserCustomResolver)
 *           .addQuery({
 *             name: 'findUserByEmail',
 *             methodName: 'findByEmail',
 *             permissions: [Permission.READ_USERS]
 *           })
 *           .addMutation({
 *             name: 'changeUserPassword',
 *             methodName: 'changePassword',
 *             permissions: [Permission.UPDATE_USERS]
 *           })
 *           .and()
 *         // Add subscription support
 *         .withSubscription({
 *           filter: UserSubscriptionFilterInput,
 *           resolver: CustomUserSubscriptionResolver
 *         }),
 *     ]),
 * ]})
 * export class AppModule {}
 * ```
 */
export declare class CrudModulesFactory {
    /**
     * Starts the configuration process for a specific entity type.
     * Call this first for each entity you want to manage.
     * @param entity The class representing the entity type (e.g., `User`).
     * @returns An object with the `withConfig` method to provide core CRUD configuration.
     * @template Item The entity type.
     */
    static forEntity<Item>(entity: Type<Item>): {
        /**
         * Provides the basic configuration necessary for generating CRUD operations
         * (queries, mutations) for the specified entity.
         * @param config An object containing the logical model name (e.g., Prisma model name)
         * and the classes representing the GraphQL input types for create, update, updateMany, and where operations.
         * @returns A `CrudModuleConfig` instance allowing further configuration chaining (e.g., adding relations).
         */
        withConfig<CreateInput, UpdateInput, UpdateManyInput, WhereInput>(config: {
            modelName: string;
            createInput: Type<CreateInput>;
            updateInput: Type<UpdateInput>;
            updateManyInput: Type<UpdateManyInput>;
            whereInput: Type<WhereInput>;
        }): CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput>;
    };

    /**
     * Specifies the global `DataProvider` and `FieldSelectionProvider` implementations
     * that will be used by all generated CRUD modules. These providers handle the actual
     * database interaction and field selection logic.
     * @param dataProvider The class implementing the `DataProvider` interface.
     * @param fieldSelectionProvider The class implementing the `FieldSelectionProvider` interface.
     * @returns An object with the `forRoot` method to finalize module creation.
     */
    static using(dataProvider: Type<DataProvider>, fieldSelectionProvider: Type<FieldSelectionProvider>): {
        /**
         * Creates the dynamic NestJS module containing all configured CRUD modules,
         * relation resolvers, subscription handlers, and the specified global providers.
         * This resulting module should be included in the `imports` array of your root AppModule
         * or a relevant feature module.
         * @param configBuilders An array of `CrudModuleConfig` instances, each fully configured
         * using the `forEntity(...).withConfig(...).addRelation(...)` chain.
         * @returns The configured `DynamicModule` ready to be imported by NestJS.
         */
        forRoot(configBuilders: BaseCrudModuleConfig<any>[]): DynamicModule;
    };
}

/**
 * A default implementation of `FieldSelectionProvider` that uses the `@paljs/plugins`
 * library to parse GraphQL query info (`GraphQLResolveInfo`) and generate a
 * Prisma-compatible `select` object. Useful when using Prisma as the backend.
 */
export declare class PrismaFieldSelectionProvider implements FieldSelectionProvider {
    /**
     * Parses GraphQL info using `@paljs/plugins` PrismaSelect.
     * @param info The `GraphQLResolveInfo` object provided by the GraphQL execution engine.
     * @returns A Prisma-compatible `select` object structure usable in `prismaClient.model.find*` calls.
     * @template EntityType The entity type being queried.
     */
    parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType>;
}

/**
 * A factory function that generates a NestJS injectable class implementing the `DataProvider`
 * interface specifically for use with Prisma. It handles the necessary dependency injection
 * of the `PrismaClient`.
 * @param Service The constructor of your `PrismaClient` class (or an extended subclass).
 * This allows the generated provider to obtain an instance of the Prisma client via NestJS DI.
 * @returns A NestJS injectable class (`Type<DataProvider>`) that implements the `DataProvider`
 * interface using the provided `PrismaClient` service for database operations.
 * @example
 * ```typescript
 * // In CrudModulesFactory setup:
 * CrudModulesFactory.using(
 *  PrismaDataProvider(PrismaClient), // Pass your PrismaClient class here
 *  PrismaFieldSelectionProvider
 * ).forRoot(...)
 * ```
 */
export declare function PrismaDataProvider(Service: Type<PrismaClient>): Type<DataProvider>;

/**
 * A decorator function that marks a method's parameter as the current `PubSub` instance.
 * This is useful for injecting the `PubSub` instance into your subscription resolvers
 * or other classes that need to publish events.
 * @returns A parameter decorator that can be applied to method parameters.
 * @example
 * ```typescript
 * import { PubSub } from 'graphql-subscriptions';
 * import { CurrentPubSub } from '@eleven-am/nestjs-graphql-crud';
 *
 * class MySubscriptionResolver {
 *   constructor(@CurrentPubSub() private pubSub: PubSub) {}
 * }
 * ```
 * This decorator will inject the current `PubSub` instance into the constructor of your class.
 * You can then use this instance to publish events to subscribers.
 */
export declare function CurrentPubSub(): ParameterDecorator;

/**
 * A factory function that creates a `FindManyContract` type for a specific entity type.
 * This is useful for defining the structure of the input arguments for the `findMany`
 * method in your data provider.
 * @param whereInput The type of the where input for filtering results.
 * @param modelName The logical name or identifier of the data model (e.g., Prisma model name).
 * @returns A `Type<FindManyContract<T>>` representing the structure of the find many contract.
 */
export declare function createFindMany<T> (whereInput: Type<T>, modelName: string): Type<FindManyContract<T>>;
