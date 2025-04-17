/**
 * @module providers/prisma/prismaFieldSelectionProvider
 * @description Prisma implementation of the FieldSelectionProvider interface
 */

import {Injectable} from "@nestjs/common";
import {FieldSelectionProvider, FieldSelectionResult} from "../../types";
import {GraphQLResolveInfo} from "graphql";
import {PrismaSelect} from '@paljs/plugins';

/**
 * Prisma implementation of the FieldSelectionProvider interface
 * Handles GraphQL field selection for Prisma queries using @paljs/plugins
 */
@Injectable()
export class PrismaFieldSelectionProvider implements FieldSelectionProvider {
    /**
     * Parse field selection from GraphQL info
     *
     * @template EntityType - The entity type for which fields are being selected
     * @param {GraphQLResolveInfo} info - GraphQL resolver info containing selection set
     * @returns {FieldSelectionResult<EntityType>} Structured selection object for Prisma
     */
    parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType> {
        return new PrismaSelect(info).value.select;
    }
}
