/**
 * @module decorators
 * @description Provides decorators and utility functions for GraphQL resolvers
 */

import { applyDecorators, Inject, Type } from "@nestjs/common";
import { Field, InputType } from "@nestjs/graphql";
import { FindManyContract } from "./internalTypes";

/**
 * Utility function to capitalize the first letter of a string
 *
 * @param {string} str - Input string
 * @returns {string} String with first letter uppercase and remaining letters lowercase
 */
export function firstLetterUppercase (str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Input type for pagination arguments
 */
@InputType()
export class PaginationArgs {
    /**
     * Maximum number of records to return
     */
    @Field(() => Number, { nullable: true })
    take: number;

    /**
     * Number of records to skip
     */
    @Field(() => Number, { nullable: true })
    skip: number;
}

/**
 * Cache to store generated FindMany input types
 */
const findManyArgsCache = new Map<string, Type<FindManyContract<any>>>();

/**
 * Creates a GraphQL input type for FindMany operations
 *
 * @template T - The type of the where input
 * @param {Type<T>} whereInput - The where input class
 * @param {string} modelName - The name of the model
 * @returns {Type<FindManyContract<T>>} A dynamically generated input type for FindMany operations
 */
export function createFindMany<T> (whereInput: Type<T>, modelName: string): Type<FindManyContract<T>> {
    const className = `${firstLetterUppercase(modelName)}FindManyArgs`;

    // Return cached class if it exists
    if (findManyArgsCache.has(className)) {
        return findManyArgsCache.get(className) as Type<FindManyContract<T>>;
    }

    /**
     * Input type for FindMany operations
     */
    @InputType(className)
    class FindManyArgs<T> {
        /**
         * Where conditions for filtering results
         */
        @Field(() => whereInput, { nullable: true })
        where?: T;

        /**
         * Pagination arguments
         */
        @Field(() => PaginationArgs, { nullable: true })
        pagination?: PaginationArgs;
    }

    // Give the dynamic class a descriptive name for easier debugging
    Object.defineProperty(FindManyArgs, 'name', {
        value: className,
        writable: false,
    });

    // Cache the class for future use
    findManyArgsCache.set(className, FindManyArgs);

    return FindManyArgs;
}

export const PUB_SUB_SYMBOL = Symbol('PUB_SUB_SYMBOL');

export const CurrentPubSub = applyDecorators(
    Inject(PUB_SUB_SYMBOL),
)
