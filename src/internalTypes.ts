/**
 * @module types
 * @description Type definitions for the CRUD module system
 */

import { Type } from "@nestjs/common";
import { AppAbilityType, WillAuthorize } from "@eleven-am/authorizer";
import { Field, InputType } from "@nestjs/graphql";
import { GraphQLResolveInfo } from "graphql";

/**
 * Enum for subscription action types
 */
export enum SubscriptionAction {
    /** Entity was created */
    CREATE = "CREATE",
    /** Entity was updated */
    UPDATE = "UPDATE",
    /** Entity was deleted */
    DELETE = "DELETE",
    /** Multiple entities were deleted */
    DELETE_MANY = "DELETE_MANY",
    /** Multiple entities were updated */
    UPDATE_MANY = "UPDATE_MANY",
}

/**
 * Interface for pagination parameters
 */
export interface PaginationContract {
    /** Maximum number of records to return */
    take: number;
    /** Number of records to skip */
    skip: number;
}

/**
 * Interface for query filtering options
 */
export interface QueryFilterOptions<WhereInputType> {
    where: WhereInputType;
}

/**
 * Interface for query pagination and sorting
 */
export interface QueryOptions<WhereInputType> extends QueryFilterOptions<WhereInputType> {
    pagination?: PaginationContract;
    orderBy?: Record<string, 'asc' | 'desc'>;
}

/**
 * Interface for FindMany query parameters
 *
 * @template WhereInput - The type of the where input
 */
export interface FindManyContract<WhereInput> {
    /** Filter criteria */
    where?: WhereInput;
    /** Pagination parameters */
    pagination?: PaginationContract;
}

/**
 * Result of field selection parsing
 *
 * @template EntityType - The entity type for which fields are being selected
 */
export interface FieldSelectionResult<EntityType> {
    /**
     * Fields to select from the entity
     * Keys are field names from EntityType, values are either boolean or nested selections
     */
    select: {
        [K in keyof EntityType]?: EntityType[K] extends Array<infer U> ?
            boolean :
            EntityType[K] extends object ?
                FieldSelectionResult<EntityType[K]> :
                boolean;
    };
}

/**
 * Interface for field selection handling
 */
export interface FieldSelectionProvider {
    /**
     * Parse field selection from GraphQL info
     *
     * @template EntityType - The entity type for which fields are being selected
     * @param {GraphQLResolveInfo} info - GraphQL resolver info containing selection set
     * @returns {FieldSelectionResult<EntityType>} Structured selection object for the entity
     */
    parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType>;
}

/**
 * Interface for abstract data provider that handles database operations
 */
export interface DataProvider {
    /**
     * Find a single entity by criteria
     */
    findOne<EntityType, WhereInputType>(
        modelName: string,
        ability: AppAbilityType,
        where: WhereInputType,
        select: Record<string, boolean>
    ): Promise<EntityType | null>;

    /**
     * Find multiple entities matching criteria
     */
    findMany<EntityType, WhereInputType>(
        modelName: string,
        ability: AppAbilityType,
        args: QueryOptions<WhereInputType>,
        select: Record<string, boolean>
    ): Promise<EntityType[]>;

    /**
     * Create a new entity
     */
    create<EntityType, CreateInputType>(
        modelName: string,
        data: CreateInputType,
        select: Record<string, boolean>
    ): Promise<EntityType>;

    /**
     * Update a single entity by ID
     */
    update<EntityType, UpdateInputType>(
        modelName: string,
        ability: AppAbilityType,
        data: UpdateInputType,
        whereId: string,
        select: Record<string, boolean>
    ): Promise<EntityType>;

    /**
     * Update multiple entities matching criteria
     */
    updateMany<EntityType, UpdateInputType, WhereInputType>(
        modelName: string,
        ability: AppAbilityType,
        data: UpdateInputType,
        where: WhereInputType,
        select: Record<string, boolean>
    ): Promise<EntityType[]>;

    /**
     * Delete a single entity by ID
     */
    delete<EntityType>(
        modelName: string,
        ability: AppAbilityType,
        whereId: string,
        select: Record<string, boolean>
    ): Promise<EntityType>;

    /**
     * Delete multiple entities matching criteria
     */
    deleteMany<EntityType, WhereInputType>(
        modelName: string,
        ability: AppAbilityType,
        where: WhereInputType,
        select: Record<string, boolean>
    ): Promise<EntityType[]>;
}

/**
 * Interface for subscription resolver
 * This focuses only on subscription filtering and resolution
 */
export interface SubscriptionResolver<EntityType, FilterType> {
    /**
     * Filter subscription events
     * Determines if the changes should be sent to a specific subscriber
     */
    filter(filter: FilterType, changes: EntityType[]): boolean;

    /**
     * Resolve entities for subscription updates
     * Transforms the raw changed entities into the final form sent to subscribers
     */
    resolve(filter: FilterType, changes: EntityType[]): Promise<EntityType[]>;
}

/**
 * Interface for options to create a base CRUD resolver
 *
 * @template Item - The entity type
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 */
export interface CreateBaseCrudResolverOptions<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
> {
    /** Name of the model in Prisma */
    modelName: string;
    /** Entity class */
    entity: Type<Item>;
    /** Input type for create operations */
    createInput: Type<CreateInput>;
    /** Input type for update operations */
    updateInput: Type<UpdateInput>;
    /** Input type for update many operations */
    updateManyInput: Type<UpdateManyInput>;
    /** Input type for query filters */
    whereInput: Type<WhereInput>;
}

/**
 * Base interface for relation resolver configuration
 *
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
interface BaseRelationResolverOptions<Target, WhereInput> {
    /** Field name in the GraphQL schema */
    fieldName: string;
    /** Target model name in Prisma */
    targetModel: string;
    /** Optional input type for filtering related entities */
    targetWhereInput?: Type<WhereInput>
    /** Target entity class */
    targetType: Type<Target>;
    /** Whether the where parameter is nullable */
    whereNullable: boolean;
}

/**
 * Interface for one-to-many relation resolver configuration
 *
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
export interface OneToManyRelationResolverConfig<Target, WhereInput> extends BaseRelationResolverOptions<Target, WhereInput> {
    /** Field name in the target model that references the parent */
    relationField: keyof Target;
}

/**
 * Interface for one-to-one relation resolver configuration
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 */
export interface OneToOneRelationResolverConfig<Item, Target> extends Omit<
    BaseRelationResolverOptions<Target, unknown>,
    'targetWhereInput' | 'whereNullable'
> {
    /** Field name in the parent model that references the target */
    relationField: keyof Item;
    /** Flag indicating this is a one-to-one relation */
    oneToOneRelation: true
}

/**
 * Interface for custom relation resolver implementation
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
export interface CustomRelationResolver<Item, Target, WhereInput> {
    /**
     * Resolve method for the relation
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {Item} item - The parent entity instance
     * @param {any} context - Additional context
     * @param {FindManyContract<WhereInput>} [args] - Optional filter arguments
     * @returns {Promise<Target | Target[]>} The resolved relation(s)
     */
    resolve(ability: AppAbilityType, item: Item, context: any, args?: FindManyContract<WhereInput>): Promise<Target | Target[]>;
}

/**
 * Interface for custom resolver configuration
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
export interface CustomResolverConfig<Item, Target, WhereInput> extends BaseRelationResolverOptions<Target, WhereInput> {
    /** Factory class that implements the custom resolver */
    factoryClass: Type<CustomRelationResolver<Item, Target, WhereInput>>;
    /** Whether the relation returns multiple entities */
    isMany?: boolean;
}

/**
 * Union type of all relation resolver configurations
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
export type RelationResolverConfig<Item, Target, WhereInput> =
    | CustomResolverConfig<Item, Target, WhereInput>
    | OneToManyRelationResolverConfig<Target, WhereInput>
    | OneToOneRelationResolverConfig<Item, Target>;

/**
 * Interface for CRUD module options
 *
 * @template Item - The entity type
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 */
export interface CrudModuleOptions<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
> extends CreateBaseCrudResolverOptions<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput
> {
    /** Optional authorizer provider */
    authorizer?: Type<WillAuthorize>;
    /** Optional relation resolvers */
    relationResolvers?: RelationResolverConfig<Item, unknown, unknown>[];
    /** Optional subscription resolver configuration */
    subscriptionResolver?: {
        filter: Type,
        resolver: Type<SubscriptionResolver<Item, unknown>>;
    };
}

/**
 * Extended CRUD module options with provider options
 */
export interface ExtendedCrudModuleOptions<
    EntityType,
    CreateInputType,
    UpdateInputType,
    UpdateManyInputType,
    WhereInputType,
> extends CrudModuleOptions<
    EntityType,
    CreateInputType,
    UpdateInputType,
    UpdateManyInputType,
    WhereInputType
> {
    /**
     * Data provider implementation
     */
    dataProvider: Type<DataProvider>;

    /**
     * Field selection provider implementation
     */
    fieldSelectionProvider: Type<FieldSelectionProvider>;
}

/**
 * Interface for generic CRUD service
 *
 * @template Item - The entity type
 * @template CreateInput - The input type for create operations
 * @template UpdateInput - The input type for update operations
 * @template UpdateManyInput - The input type for update many operations
 * @template WhereInput - The input type for query filters
 */
export interface IGenericCrudService<
    Item,
    CreateInput,
    UpdateInput,
    UpdateManyInput,
    WhereInput,
> {
    /**
     * Create a new entity
     *
     * @param {CreateInput} data - The data to create the entity with
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item>} The newly created entity
     */
    create(data: CreateInput, select: any): Promise<Item>;

    /**
     * Find a single entity by criteria
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {WhereInput} where - Filter criteria
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item | null>} The found entity or null
     */
    findOne(ability: AppAbilityType, where: WhereInput, select: any): Promise<Item | null>;

    /**
     * Find multiple entities matching criteria
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {FindManyContract<WhereInput>} args - Filter and pagination criteria
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item[]>} Array of matched entities
     */
    findMany(ability: AppAbilityType, args: FindManyContract<WhereInput>, select: any): Promise<Item[]>;

    /**
     * Update a single entity by ID
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {UpdateInput} data - The data to update
     * @param {string} whereId - The ID of the entity to update
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item>} The updated entity
     */
    update(ability: AppAbilityType, data: UpdateInput, whereId: string, select: any): Promise<Item>;

    /**
     * Update multiple entities matching criteria
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {UpdateManyInput} data - The data to update
     * @param {WhereInput} where - Filter criteria for entities to update
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item[]>} Array of updated entities
     */
    updateMany(ability: AppAbilityType, data: UpdateManyInput, where: WhereInput, select: any): Promise<Item[]>;

    /**
     * Delete a single entity by ID
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {string} whereId - The ID of the entity to delete
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item>} The deleted entity
     */
    delete(ability: AppAbilityType, whereId: string, select: any): Promise<Item>;

    /**
     * Delete multiple entities matching criteria
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {WhereInput} where - Filter criteria for entities to delete
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Item[]>} Array of deleted entities
     */
    deleteMany(ability: AppAbilityType, where: WhereInput, select: any): Promise<Item[]>;
}

/**
 * Interface for resolver class that handles relations
 *
 * @template Item - The parent entity type
 * @template Target - The related entity type
 * @template WhereInput - The input type for query filters
 */
export interface IResolverClass<Item, Target, WhereInput> {
    /**
     * field selection provider instance
     */
    fieldSelectionProvider: FieldSelectionProvider;

    /**
     * Resolve a one-to-one relation
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {string} targetModel - The name of the target model
     * @param {string} itemId - The ID of the related item
     * @param {any} select - Fields to select in the result
     * @returns {Promise<Target | null>} The related entity or null
     */
    resolveOneToOne(ability: AppAbilityType, targetModel: string, itemId: string, select: any): Promise<Target | null>;

    /**
     * Resolve a one-to-many relation
     *
     * @param {AppAbilityType} ability - The user's ability for authorization
     * @param {string} targetModel - The name of the target model
     * @param {string} foreignKey - The foreign key field name
     * @param {string} itemId - The ID of the parent item
     * @param {any} select - Fields to select in the result
     * @param {FindManyContract<WhereInput>} [where] - Optional filter criteria
     * @returns {Promise<Target[]>} Array of related entities
     */
    resolveOneToMany(ability: AppAbilityType, targetModel: string, foreignKey: string, itemId: string, select: any, where?: FindManyContract<WhereInput>): Promise<Target[]>;

    /**
     * Get a custom relation resolver factory instance
     *
     * @template Class - The custom relation resolver type
     * @param {Type<Class>} constructor - The factory class
     * @returns {Class} The factory instance
     */
    getFactory<Class extends CustomRelationResolver<Item, Target, WhereInput>>(constructor: Type<Class>): Class;
}

/**
 * Input type for subscription filtering by IDs
 */
@InputType()
export class DefaultSubscriptionFilter {
    /** Array of entity IDs to subscribe to */
    @Field(() => [String])
    inIds: string[];
}

/**
 * Generic constructor type
 *
 * @template Class - The class type
 * @template Parameters - The constructor parameter types
 */
export type Constructor<Class, Parameters extends any[] = any[]> = new (...args: Parameters) => Class;