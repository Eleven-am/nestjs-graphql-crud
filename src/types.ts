// index.d.ts (Corrected Final Version with Full Documentation)

import {Type, DynamicModule, Provider, ForwardReference} from '@nestjs/common';
import { GraphQLResolveInfo } from 'graphql';
import {AppAbilityType, WillAuthorize} from '@eleven-am/authorizer';
import { PrismaClient } from '@prisma/client';
import { Abstract } from "@nestjs/common/interfaces/abstract.interface";

// --- Core Types and Interfaces ---

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
 * Defines the structure for 'find many' operations, including filtering and pagination.
 * Often used as input for DataProvider methods or GraphQL query arguments.
 * @template WhereInput The type defining the filter criteria for the entity.
 */
export interface FindManyContract<WhereInput> {
    /** The filter criteria object. */
    where?: WhereInput;
    /** Pagination parameters. */
    pagination?: PaginationContract;
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
    findMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, args: { where: WhereInputType; pagination?: PaginationContract; orderBy?: Record<string, 'asc' | 'desc'>; }, select: Record<string, boolean>): Promise<EntityType[]>;

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
     * @returns A promise resolving to the array of entities (potentially transformed) to be sent to the subscriber.
     */
    resolve(filter: FilterType, changes: EntityType[]): Promise<EntityType[]>;
}

/**
 * A generic constructor type representing a class constructor.
 * @template Class The class type.
 * @template Parameters The types of the constructor parameters.
 */
export type Constructor<Class, Parameters extends any[] = any[]> = new (...args: Parameters) => Class;

// --- Relation Configuration Definitions ---

/**
 * Defines the configuration for resolving a standard one-to-many relationship
 * (e.g., a User has many Posts, where Post has a `userId` field).
 * Used as input for `CrudModuleConfig.addRelation`.
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
    relationField: keyof Target;
}

/**
 * Interface for implementing custom logic to resolve a relation between entities.
 * Use this for complex scenarios not covered by standard one-to-one or one-to-many,
 * such as many-to-many relations requiring join table logic or computed relations.
 * Provide a class implementing this interface to `CustomRelationInput` or `CustomArrayRelationInput`.
 * @template Item The parent entity type (the entity type the relation field belongs to).
 * @template Target The related entity type (can be a single entity `T` or an array `T[]`).
 * @template WhereInput Input type for filtering the related entities (if applicable).
 */
export interface CustomRelationResolver<Item, Target, WhereInput> {
    /**
     * The method that implements the custom relation resolution logic.
     * It receives the parent object, authorization context, selection context, and any GraphQL arguments.
     * @param ability The authorization ability object for the current user/request context.
     * @param item The parent entity instance from which the relation originates.
     * @param context Often includes field selection info (`select`) derived from `GraphQLResolveInfo`. Use this to optimize fetching.
     * @param args Optional arguments passed to the relation field in the GraphQL query (e.g., filters defined by `WhereInput`).
     * @returns A promise resolving to the related entity (`Target` is `T`) or entities (`Target` is `T[]`).
     */
    resolve(ability: AppAbilityType, item: Item, context: any, args?: FindManyContract<WhereInput>): Promise<Target | Target[]>;
}

// --- Simplified Input Types for CrudModuleConfig ---

/**
 * Defines the configuration input for a standard one-to-one relationship
 * (e.g., a User has one Profile, where User has a `profileId` field).
 * Used as input for `CrudModuleConfig.addOneToOneRelation`.
 * @template Item The parent entity type (e.g., `User`).
 * @template Target The related entity type (e.g., `Profile`).
 */
export interface OneToOneRelationInput<Item, Target> {
    /** The name of the field in the GraphQL schema representing this relation (e.g., "profile"). */
    fieldName: string;
    /** The logical name or identifier of the related model (e.g., Prisma model name "profile"). */
    targetModel: string;
    /** The class representing the related entity type (e.g., `Profile`). */
    targetType: Type<Target>;
    /** The name of the field on the parent entity (`Item`) that holds the foreign key referencing the related entity (`Target`)'s ID (e.g., "profileId" on the `User` entity). */
    relationField: keyof Item;
}

/**
 * Defines the configuration input for a custom relationship resolver that returns a single entity.
 * Used as input for `CrudModuleConfig.addCustomRelation`.
 * @template Item The parent entity type.
 * @template Target The related entity type (single).
 * @template WhereInput Input type for filtering the related entities (if applicable).
 */
export interface CustomRelationInput<Item, Target, WhereInput> {
    /** The name of the field in the GraphQL schema representing this relation. */
    fieldName: string;
    /** Optional input type class used for filtering related entities in the GraphQL query. */
    targetWhereInput?: Type<WhereInput>;
    /** The class representing the related entity type. */
    targetType: Type<Target>;
    /** Whether the filter argument (`targetWhereInput`) is nullable in the GraphQL schema. */
    whereNullable: boolean;
    /** The class that implements the `CustomRelationResolver` interface for this relation. Must resolve to a single `Target`. */
    factoryClass: Type<CustomRelationResolver<Item, Target, WhereInput>>;
}

/**
 * Defines the configuration input for a custom relationship resolver that returns an array of entities.
 * Used as input for `CrudModuleConfig.addCustomArrayRelation`.
 * @template Item The parent entity type.
 * @template Target The *single* related entity type (the resolver will return `Target[]`).
 * @template WhereInput Input type for filtering the related entities (if applicable).
 */
export interface CustomArrayRelationInput<Item, Target, WhereInput> {
    /** The name of the field in the GraphQL schema representing this relation. */
    fieldName: string;
    /** Optional input type class used for filtering related entities in the GraphQL query. */
    targetWhereInput?: Type<WhereInput>;
    /** The class representing the *single* related entity type (the resolver must return `Target[]`). */
    targetType: Type<Target>;
    /** Whether the filter argument (`targetWhereInput`) is nullable in the GraphQL schema. */
    whereNullable: boolean;
    /** The class that implements the `CustomRelationResolver` interface for this relation. Must resolve to `Target[]`. */
    factoryClass: Type<CustomRelationResolver<Item, Target[], WhereInput>>;
}

// --- Configuration Builder ---

/**
 * Provides a fluent API for configuring a CRUD module for a specific entity.
 * Instances are created via `CrudModulesFactory.forEntity(...).withConfig(...)`.
 * Use its methods (`addRelation`, `withSubscription`, etc.) to customize module generation by adding
 * relation resolvers and subscription handling before passing the config to `CrudModulesFactory.forRoot`.
 * @template Item The primary entity type for this module (e.g., `User`).
 * @template CreateInput Input type class for creating the entity (e.g., `UserCreateInput`).
 * @template UpdateInput Input type class for updating the entity (e.g., `UserUpdateInput`).
 * @template UpdateManyInput Input type class for updating multiple entities (e.g., `UserUpdateManyInput`).
 * @template WhereInput Input type class for filtering the entity (e.g., `UserWhereInput`).
 */
export declare class CrudModuleConfig<Item, CreateInput, UpdateInput, UpdateManyInput, WhereInput> {
    /**
     * Adds configuration for resolving a standard one-to-many relationship.
     * The library will automatically generate the necessary resolver logic.
     * @param config Configuration object defining the one-to-many relation details.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    addRelation<Target, TargetWhereInput>(config: OneToManyRelationResolverConfig<Target, TargetWhereInput>): this;

    /**
     * Adds configuration for resolving a relation using a custom resolver class provided by you.
     * Use this for complex logic. The custom resolver must return a single related entity.
     * @param config Configuration object pointing to your `CustomRelationResolver` implementation.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    addCustomRelation<Target, TargetWhereInput>(config: CustomRelationInput<Item, Target, TargetWhereInput>): this;

    /**
     * Adds configuration for resolving a relation using a custom resolver class provided by you.
     * Use this for complex logic. The custom resolver must return an array of related entities.
     * @param config Configuration object pointing to your `CustomRelationResolver` implementation.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    addCustomArrayRelation<Target, TargetWhereInput>(config: CustomArrayRelationInput<Item, Target, TargetWhereInput>): this;

    /**
     * Adds configuration for resolving a standard one-to-one relationship.
     * The library will automatically generate the necessary resolver logic.
     * @param config Configuration object defining the one-to-one relation details.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    addOneToOneRelation<Target>(config: OneToOneRelationInput<Item, Target>): this;

    /**
     * Adds configuration for custom subscription filtering and resolution logic.
     * Provide your own filter input type and an implementation of `SubscriptionResolver`.
     * @param config Object containing the GraphQL filter input type class and the `SubscriptionResolver` implementation class.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    withSubscription<FilterType>(config: { filter: Type<FilterType>; resolver: Type<SubscriptionResolver<Item, FilterType>>; }): this;

    /**
     * Adds a custom authorization logic class to the module.
     * This class should implement the `WillAuthorize` interface from `@eleven-am/authorizer`.
     * @param authorizers The class implementing the `WillAuthorize` interface.
     * @returns The `CrudModuleConfig` instance for chaining.
     */
    withAuthorization(...authorizers: Type<WillAuthorize>[]): this;

    /**
     * Adds providers to the module. This is useful for injecting additional services or dependencies
     * @param providers An array of NestJS providers to be included in the module.
     */
    withProviders(...providers: Provider[]): this;

    /**
     * Adds controllers to the module. This is useful for exposing additional endpoints or functionalities.
     * @param controllers An array of NestJS controller classes to be included in the module.
     */
    withControllers(...controllers: Type[]): this;

    /**
     * Adds imports to the module. This is useful for importing other modules that provide additional functionalities.
     * @param imports An array of NestJS modules to be imported into this module.
     */
    import(...imports: (Type | DynamicModule | Promise<DynamicModule> | ForwardReference)[]): this;

    /**
     * Adds exports to the module. This is useful for exporting providers or modules for use in other modules.
     * @param exports An array of NestJS providers or modules to be exported from this module.
     */
    export (...exports: (DynamicModule | string | symbol | Provider | ForwardReference | Abstract<any> | Function)[]): this;
}

// --- Module Factory ---

/**
 * Factory class for creating and registering all CRUD modules based on provided configurations.
 * This is the main entry point for integrating the library into a NestJS application.
 *
 * @example
 * ```typescript
 * // In your NestJS module (e.g., app.module.ts)
 * @Module({
 * imports: [
 * // 1. Specify global providers (DataProvider, FieldSelectionProvider)
 * CrudModulesFactory
 * .using(MyPrismaDataProvider, MyPrismaFieldSelectionProvider)
 * // 2. Provide configurations for all desired entities
 * .forRoot([
 * // Configure the 'User' entity
 * CrudModulesFactory
 *  .forEntity(User)
 *  .withConfig({ // Basic CRUD setup
 *     modelName: 'user',
 *     createInput: UserCreateInput,
 *     updateInput: UserUpdateInput,
 *     updateManyInput: UserUpdateManyInput,
 *     whereInput: UserWhereInput,
 *  })
 * // Add relations (example: User has many Posts)
 *  .addRelation<Post, PostWhereInput>({
 *     fieldName: 'posts',
 *     targetModel: 'post',
 *     targetType: Post,
 *     targetWhereInput: PostWhereInput,
 *     whereNullable: true,
 *     relationField: 'authorId' // 'authorId' field on Post points to User
 *  })
 * // Add custom subscription handling (optional)
 *  .withSubscription({ filter: UserSubscriptionFilterInput, resolver: CustomUserSubscriptionResolver }),
 *
 * // Configure the 'Post' entity (example)
 * CrudModulesFactory
 *  .forEntity(Post)
 *  .withConfig({ ...postConfig... })
 *  .addOneToOneRelation<User>({ // Example: Post belongs to one User
 *     fieldName: 'author',
 *     targetModel: 'user',
 *     targetType: User,
 *     relationField: 'authorId' // 'authorId' field on Post points to User
 *  }),
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
        forRoot(configBuilders: CrudModuleConfig<any, any, any, any, any>[]): DynamicModule;
    };
}

// --- Default Provider Implementations ---

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
 * A decorator function that marks a method's parameter as the current `PubSub` instance.'
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
export declare function CurrentPubSub (): ParameterDecorator
