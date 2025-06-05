# @eleven-am/nestjs-graphql-crud

[![npm version](https://badge.fury.io/js/%40eleven-am%2Fnestjs-graphql-crud.svg)](https://badge.fury.io/js/%40eleven-am%2Fnestjs-graphql-crud)

A powerful CRUD module generator for NestJS GraphQL applications. This library helps you rapidly build GraphQL APIs with minimal boilerplate code by automatically generating resolvers, services, and subscriptions.

## 🌟 Features

* **Dynamic CRUD Module Generation:** Automatically creates NestJS modules, services, and GraphQL resolvers based on simple configuration
* **Type Inference:** Leverages TypeScript's type system with automatic type inference - no need to specify explicit type parameters
* **Authorization Support:** Seamless integration with `@eleven-am/authorizer` for fine-grained access control across all operations
* **Relation Handling:** Easy configuration for one-to-one, one-to-many, and custom relationship resolvers
* **Real-time Updates:** Built-in GraphQL subscription support with customizable filtering
* **Database Agnostic:** Abstract data layer with ready-to-use Prisma integration, extensible to other ORMs
* **Field Selection:** Intelligent selection of requested fields for optimized database queries
* **Advanced Query Support:** Full support for Prisma-style features including cursor pagination, ordering, and distinct queries
* **Tool Integration:** Compatible with code generators like `prisma-nest-graphql`

## 📦 Installation

```bash
# Using npm
npm install @eleven-am/nestjs-graphql-crud @nestjs/graphql @nestjs/apollo @apollo/server graphql graphql-subscriptions @nestjs/common @nestjs/core reflect-metadata rxjs @eleven-am/authorizer

# Using yarn
yarn add @eleven-am/nestjs-graphql-crud @nestjs/graphql @nestjs/apollo @apollo/server graphql graphql-subscriptions @nestjs/common @nestjs/core reflect-metadata rxjs @eleven-am/authorizer

# If using Prisma (recommended)
npm install @prisma/client @paljs/plugins
# or
yarn add @prisma/client @paljs/plugins
```

**Note:** Ensure you have set up `@nestjs/graphql` within your project according to the official NestJS documentation.

## 🚀 Quick Start

Let's set up CRUD operations for `User` and `Post` entities using Prisma:

### 1. Define your entities and input types

Make sure you have your GraphQL entity classes (`User`, `Post`) and corresponding input types defined.

### 2. Configure the CRUD modules in your `AppModule`:

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { CrudModulesFactory, PrismaDataProvider, PrismaFieldSelectionProvider } from '@eleven-am/nestjs-graphql-crud';
import { PrismaClient } from '@prisma/client';

// Import your entity classes and GraphQL input types
import { User } from './entities/user.entity';
import { Post } from './entities/post.entity';
import { UserCreateInput, UserUpdateInput, UserUpdateManyInput, UserWhereInput } from './inputs/user';
import { PostCreateInput, PostUpdateInput, PostUpdateManyInput, PostWhereInput } from './inputs/post';

@Module({
  imports: [
    // NestJS GraphQL Module Setup
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      subscriptions: {
        'graphql-ws': true,
      },
    }),

    // nestjs-graphql-crud Setup
    CrudModulesFactory
      .using(PrismaDataProvider(PrismaClient), PrismaFieldSelectionProvider)
      .forRoot([
        // User CRUD module with posts relation
        CrudModulesFactory.forEntity(User)
          .withConfig({
            modelName: 'user',
            createInput: UserCreateInput,
            updateInput: UserUpdateInput,
            updateManyInput: UserUpdateManyInput,
            whereInput: UserWhereInput,
          })
          .addRelation({
            fieldName: 'posts',
            targetModel: 'post',
            targetType: Post,
            targetWhereInput: PostWhereInput,
            whereNullable: true,
            relationField: 'authorId'
          }),

        // Post CRUD module with author relation
        CrudModulesFactory.forEntity(Post)
          .withConfig({
            modelName: 'post',
            createInput: PostCreateInput,
            updateInput: PostUpdateInput,
            updateManyInput: PostUpdateManyInput,
            whereInput: PostWhereInput,
          })
          .addOneToOneRelation({
            fieldName: 'author',
            targetModel: 'user',
            targetType: User,
            relationField: 'authorId'
          }),
      ]),
  ],
  providers: [PrismaClient],
})
export class AppModule {}
```

### 3. Run your NestJS application

The library will generate all necessary resolvers. You can immediately use your GraphQL API with the following operations.

## 📝 Generated GraphQL Operations

For each configured entity, the library generates:

### Queries
* `{modelName}FindOne(where: {WhereInput}): {Entity}`
* `{modelName}FindMany(filter: {ModelName}FindManyArgs): [{Entity}]`

### Mutations
* `{modelName}Create(data: {CreateInput}): {Entity}`
* `{modelName}Update(data: {UpdateInput}, id: String): {Entity}`
* `{modelName}UpdateMany(data: {UpdateManyInput}, where: {WhereInput}): [{Entity}]`
* `{modelName}Delete(id: String): {Entity}`
* `{modelName}DeleteMany(where: {WhereInput}): [{Entity}]`

### Subscriptions
* `{modelName}s(filter: SubscriptionFilter): [{Entity}]`

## 🔧 Advanced Query Features

### Using Custom FindMany Args (Relay Pagination & Advanced Filtering)

If you're using code generators like `prisma-nest-graphql` that produce advanced FindMany argument types with cursor-based pagination, ordering, and distinct queries, you can use them directly:

```typescript
// Generated by prisma-nest-graphql or similar tools
@ArgsType()
export class FindManyUserArgs {
  @Field(() => UserWhereInput, {nullable: true})
  where?: UserWhereInput;

  @Field(() => [UserOrderByWithRelationInput], {nullable: true})
  orderBy?: Array<UserOrderByWithRelationInput>;

  @Field(() => UserWhereUniqueInput, {nullable: true})
  cursor?: UserWhereUniqueInput;

  @Field(() => Int, {nullable: true})
  take?: number;

  @Field(() => Int, {nullable: true})
  skip?: number;

  @Field(() => [UserScalarFieldEnum], {nullable: true})
  distinct?: Array<UserScalarFieldEnum>;
}

// Use in your CRUD configuration
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
  .withFindManyArgs(FindManyUserArgs) // 🎉 Enable advanced query features
  .addRelation({
    fieldName: 'posts',
    targetModel: 'post',
    targetType: Post,
    targetWhereInput: PostWhereInput,
    whereNullable: true,
    relationField: 'authorId'
  })
```

This enables your GraphQL API to support advanced queries like:

```graphql
query {
  userFindMany(
    where: { name: { contains: "john" } }
    orderBy: [{ createdAt: desc }, { name: asc }]
    cursor: { id: "user123" }
    take: 10
    distinct: [email]
  ) {
    id
    name
    email
    posts {
      title
    }
  }
}
```

### Default vs Custom FindMany Behavior

**Without `withFindManyArgs()` (default behavior):**
```graphql
# Simple take/skip pagination
query {
  userFindMany(filter: {
    where: { name: { contains: "john" } }
    pagination: { take: 10, skip: 0 }
  }) {
    id
    name
  }
}
```

**With `withFindManyArgs()` (advanced features):**
```graphql
# Full Prisma-style querying
query {
  userFindMany(
    where: { name: { contains: "john" } }
    orderBy: [{ createdAt: desc }]
    cursor: { id: "user123" }
    take: 10
    distinct: [email]
  ) {
    id
    name
  }
}
```

The library automatically detects which format you're using and handles both seamlessly while maintaining backward compatibility.

## 🛠 Advanced Usage

### Custom Resolvers

Add custom business logic resolvers alongside the generated CRUD operations:

```typescript
@Injectable()
class UserBusinessLogic {
  constructor(private prisma: PrismaClient) {}

  async findUserByEmail(
    args: { email: string }, 
    ability: AppAbilityType, 
    select: any
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: args.email },
      ...select
    });
  }

  async promoteToAdmin(
    args: { userId: string }, 
    ability: AppAbilityType, 
    select: any
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: args.userId },
      data: { role: 'ADMIN' },
      ...select
    });
  }

  async getUserStats(
    args: any,
    ability: AppAbilityType, 
    item: User, 
    select: any
  ): Promise<UserStats> {
    // Calculate stats for a specific user
    const postCount = await this.prisma.post.count({
      where: { authorId: item.id }
    });
    
    return { postCount, joinedAt: item.createdAt };
  }
}

// Then in your module configuration:
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
  .withCustomResolver(UserBusinessLogic)
    .addQuery({
      name: 'findUserByEmail',
      methodName: 'findUserByEmail',
      inputType: FindUserByEmailInput,
      outputType: () => User,
      nullable: true,
      permissions: [{ action: Action.Read, resource: 'User' }]
    })
    .addMutation({
      name: 'promoteUserToAdmin',
      methodName: 'promoteToAdmin',
      inputType: PromoteUserInput,
      outputType: () => User,
      permissions: [{ action: Action.Update, resource: 'User' }]
    })
    .addResolveField({
      name: 'getUserStats',
      methodName: 'getUserStats',
      resolveField: 'stats',
      outputType: () => UserStats,
      permissions: [{ action: Action.Read, resource: 'User' }]
    })
    .and() // Return to main config
  .addRelation({
    fieldName: 'posts',
    targetModel: 'post',
    targetType: Post,
    relationField: 'authorId'
  })
```

This generates additional GraphQL operations:

```graphql
type Query {
  # Generated CRUD operations
  userFindOne(where: UserWhereInput): User
  userFindMany(filter: UserFindManyArgs): [User!]!
  
  # Custom query
  findUserByEmail(args: FindUserByEmailInput): User
}

type Mutation {
  # Generated CRUD operations
  userCreate(data: UserCreateInput): User!
  userUpdate(data: UserUpdateInput, id: String!): User!
  # ... other generated mutations
  
  # Custom mutation
  promoteUserToAdmin(args: PromoteUserInput): User!
}

type User {
  id: String!
  email: String!
  name: String!
  
  # Custom field resolver
  stats: UserStats!
  
  # Generated relation
  posts: [Post!]!
}
```

### Custom Relation Resolvers

The library provides powerful ways to handle complex relations beyond simple one-to-many or one-to-one relationships:

```typescript
@Injectable()
class UserFriendsResolver implements CustomRelationResolver<User, User[], UserWhereInput> {
  constructor(
    @Inject('PrismaService') private prisma: PrismaClient,
  ) {}
  
  async resolve(
    ability: AppAbilityType, 
    user: User, 
    context: FieldSelectionResult<User>,
    args?: FindManyContract<UserWhereInput>
  ): Promise<User[]> {
    // Get IDs of friends from join table
    const friendIds = await this.prisma.friendship.findMany({
      where: { OR: [
        { user1Id: user.id },
        { user2Id: user.id }
      ]},
      select: { 
        user1Id: true, 
        user2Id: true 
      }
    });
    
    // Convert to array of friend IDs that aren't the current user
    const ids = friendIds.map(f => 
      f.user1Id === user.id ? f.user2Id : f.user1Id
    );
    
    // Apply additional filters from args
    const where = {
      id: { in: ids },
      ...(args?.where || {})
    };
    
    // Apply authorization filters from CASL
    return this.prisma.user.findMany({
      where: {
        AND: [
          accessibleBy(ability, Action.Read).user,
          where
        ]
      },
      ...context // Apply field selection
    });
  }
}

// Then in your module configuration:
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    // ... other config
  })
  .addCustomArrayRelation({
    fieldName: 'friends',
    targetModel: 'user',
    targetType: User,
    targetWhereInput: UserWhereInput,
    whereNullable: true,
    factoryClass: UserFriendsResolver
  })
```

### Custom Subscription Filters

Create custom subscription filters to allow clients to receive only relevant updates:

```typescript
@InputType()
class PostSubscriptionFilter {
  @Field(() => [String], { nullable: true })
  inCategories?: string[];
  
  @Field(() => String, { nullable: true })
  authorId?: string;
  
  @Field(() => Boolean, { nullable: true })
  onlyPublished?: boolean;
}

@Injectable()
class PostSubscriptionResolver implements SubscriptionResolver<Post, PostSubscriptionFilter> {
  constructor(
    @Inject('PrismaService') private prisma: PrismaClient,
  ) {}

  // Determine if a client should receive the update
  filter(filter: PostSubscriptionFilter, changes: Post[]): boolean {
    if (!filter) return true;
    
    return changes.some(post => {
      // Filter by categories if specified
      if (filter.inCategories?.length && 
          !filter.inCategories.includes(post.categoryId)) {
        return false;
      }
      
      // Filter by author if specified
      if (filter.authorId && post.authorId !== filter.authorId) {
        return false;
      }
      
      // Filter by publication status if specified
      if (filter.onlyPublished && !post.published) {
        return false;
      }
      
      return true;
    });
  }
  
  // Optionally enhance or transform the data before sending
  async resolve(filter: PostSubscriptionFilter, changes: Post[]): Promise<Post[]> {
    // You could load additional data or transform the posts
    // For example, add view counts from Redis or compute derived fields
    
    return Promise.all(changes.map(async post => {
      const viewCount = await this.getViewCount(post.id);
      return { ...post, viewCount };
    }));
  }
  
  private async getViewCount(postId: string): Promise<number> {
    // Implementation to get view count from cache/database
    return 0; // Placeholder
  }
}

// Then in your module configuration:
CrudModulesFactory.forEntity(Post)
  .withConfig({
    modelName: 'post',
    // ... other config
  })
  .withSubscription({
    filter: PostSubscriptionFilter,
    resolver: PostSubscriptionResolver
  })
```

### Custom Data Provider

Create a custom data provider for non-Prisma databases or special requirements:

```typescript
@Injectable()
export class TypeOrmDataProvider implements DataProvider {
  constructor(
    @InjectEntityManager() private entityManager: EntityManager,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Post) private postRepo: Repository<Post>,
    // ... other repositories
  ) {}

  private getRepository(modelName: string): Repository<any> {
    switch (modelName) {
      case 'user': return this.userRepo;
      case 'post': return this.postRepo;
      // ... other models
      default: throw new Error(`Unknown model: ${modelName}`);
    }
  }

  async findOne<EntityType, WhereInputType>(
    modelName: string,
    ability: AppAbilityType,
    where: WhereInputType,
    select: Record<string, boolean>
  ): Promise<EntityType | null> {
    const repo = this.getRepository(modelName);
    const caslRules = this.translateCaslToTypeOrmConditions(ability, Action.Read, modelName);
    
    return repo.findOne({
      where: {
        ...where,
        ...caslRules
      },
      select: this.translateSelectToTypeOrm(select)
    });
  }

  async findMany<EntityType, WhereInputType>(
    modelName: string,
    ability: AppAbilityType,
    args: {
      where: WhereInputType;
      pagination?: { take?: number; skip?: number };
      orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
      cursor?: any;
      distinct?: string[];
    },
    select: Record<string, boolean>
  ): Promise<EntityType[]> {
    const repo = this.getRepository(modelName);
    const caslRules = this.translateCaslToTypeOrmConditions(ability, Action.Read, modelName);
    
    const queryBuilder = repo.createQueryBuilder(modelName);
    
    // Apply where conditions
    queryBuilder.where({
      ...args.where,
      ...caslRules
    });
    
    // Apply ordering
    if (args.orderBy) {
      const orderBy = Array.isArray(args.orderBy) ? args.orderBy[0] : args.orderBy;
      Object.entries(orderBy).forEach(([field, direction]) => {
        queryBuilder.addOrderBy(`${modelName}.${field}`, direction.toUpperCase() as 'ASC' | 'DESC');
      });
    }
    
    // Apply pagination
    if (args.pagination?.take) {
      queryBuilder.limit(args.pagination.take);
    }
    if (args.pagination?.skip) {
      queryBuilder.offset(args.pagination.skip);
    }
    
    // Apply field selection
    queryBuilder.select(this.translateSelectToTypeOrm(select));
    
    return queryBuilder.getMany();
  }

  // Implement other methods similarly...

  private translateCaslToTypeOrmConditions(ability: AppAbilityType, action: Action, modelName: string): any {
    // Translation logic from CASL rules to TypeORM where conditions
    // This would depend on your authorization setup
    return {};
  }

  private translateSelectToTypeOrm(select: Record<string, boolean>): any {
    // Convert GraphQL selection to TypeORM select object
    return Object.keys(select).filter(key => select[key]);
  }
}

// Then use your custom provider:
CrudModulesFactory
  .using(TypeOrmDataProvider, YourFieldSelectionProvider)
  .forRoot([
    // Your module configurations
  ])
```

### Authorization with Custom Policies

Implement fine-grained access control with custom authorization policies:

```typescript
@Injectable()
export class UserPolicies implements WillAuthorize {
  defineRules(ability: AbilityBuilder<AppAbilityType>, user: UserEntity) {
    if (user.role === 'ADMIN') {
      // Admins can do everything with users
      ability.can(Action.Manage, 'user');
      return;
    }

    // Regular users can read all users
    ability.can(Action.Read, 'user');
    
    // Users can only update and delete their own account
    ability.can([Action.Update, Action.Delete], 'user', { id: user.id });
    
    // Premium users can create new users (invite system)
    if (user.subscription === 'PREMIUM') {
      ability.can(Action.Create, 'user');
    }
  }
}

// Then in your module configuration:
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
  .withAuthorization(UserPolicies) // Link your custom authorizer
```

### Field Selection Provider for MongoDB

Example of a custom field selection provider for MongoDB:

```typescript
@Injectable()
export class MongoFieldSelectionProvider implements FieldSelectionProvider {
  parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType> {
    // Parse GraphQL info into MongoDB projection
    const projection = {};
    const fieldNodes = info.fieldNodes[0]?.selectionSet?.selections || [];
    
    for (const field of fieldNodes) {
      if (field.kind === 'Field') {
        projection[field.name.value] = 1;
        
        // Handle nested selections recursively
        if (field.selectionSet) {
          // Process nested fields for MongoDB subdocuments or lookups
          // ...
        }
      }
    }
    
    return { select: projection as any };
  }
}

// Then use your custom provider:
CrudModulesFactory
  .using(YourMongoDataProvider, MongoFieldSelectionProvider)
  .forRoot([
    // Your module configurations
  ])
```

### Complex Module Setup with Multiple Relations

Example of a complex entity with multiple relation types and advanced features:

```typescript
import { FindManyBlogPostArgs } from './generated/find-many-blog-post.args'; // Generated by prisma-nest-graphql

CrudModulesFactory.forEntity(BlogPost)
  .withConfig({
    modelName: 'blogPost',
    createInput: BlogPostCreateInput,
    updateInput: BlogPostUpdateInput,
    updateManyInput: BlogPostUpdateManyInput,
    whereInput: BlogPostWhereInput,
  })
  // Enable advanced query features (cursor pagination, orderBy, distinct)
  .withFindManyArgs(FindManyBlogPostArgs)
  // One-to-one relation to author
  .addOneToOneRelation({
    fieldName: 'author',
    targetModel: 'user',
    targetType: User,
    relationField: 'authorId'
  })
  // One-to-many relation to comments
  .addRelation({
    fieldName: 'comments',
    targetModel: 'comment',
    targetType: Comment,
    targetWhereInput: CommentWhereInput,
    whereNullable: true,
    relationField: 'postId'
  })
  // Custom relation to related posts (based on tags)
  .addCustomArrayRelation({
    fieldName: 'relatedPosts',
    targetModel: 'blogPost',
    targetType: BlogPost,
    targetWhereInput: BlogPostWhereInput,
    whereNullable: true,
    factoryClass: BlogPostRelatedResolver
  })
  // Add custom business logic
  .withCustomResolver(BlogPostBusinessLogic)
    .addQuery({
      name: 'findTrendingPosts',
      methodName: 'findTrending',
      inputType: TrendingPostsInput,
      outputType: () => [BlogPost],
      permissions: [{ action: Action.Read, resource: 'BlogPost' }]
    })
    .addMutation({
      name: 'publishPost',
      methodName: 'publish',
      inputType: PublishPostInput,
      outputType: () => BlogPost,
      permissions: [{ action: Action.Update, resource: 'BlogPost' }]
    })
    .addResolveField({
      name: 'getPostAnalytics',
      methodName: 'getAnalytics',
      resolveField: 'analytics',
      outputType: () => PostAnalytics,
      permissions: [{ action: Action.Read, resource: 'BlogPost' }]
    })
    .and()
  // Custom subscription filtering
  .withSubscription({
    filter: BlogPostSubscriptionFilter,
    resolver: BlogPostSubscriptionResolver
  })
```

## 🔑 Key Concepts

### Dynamic Module Generation

The library uses NestJS's dynamic module system to generate CRUD modules on-the-fly:

- Each entity gets a dedicated dynamically-generated module with proper naming for debugging
- The module contains all necessary providers (services, resolvers) with proper dependency injection
- Generated modules are incorporated into your main NestJS application via the `.forRoot()` method

### Data Providers

The `DataProvider` interface serves as an abstraction layer between your CRUD operations and database:

```typescript
interface DataProvider {
  findOne<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType | null>;
  findMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, args: {
    where: WhereInputType;
    pagination?: { take?: number; skip?: number };
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    cursor?: any;
    distinct?: string[];
  }, select: Record<string, boolean>): Promise<EntityType[]>;
  create<EntityType, CreateInputType>(modelName: string, data: CreateInputType, select: Record<string, boolean>): Promise<EntityType>;
  update<EntityType, UpdateInputType>(modelName: string, ability: AppAbilityType, data: UpdateInputType, whereId: string, select: Record<string, boolean>): Promise<EntityType>;
  updateMany<EntityType, UpdateInputType, WhereInputType>(modelName: string, ability: AppAbilityType, data: UpdateInputType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType[]>;
  delete<EntityType>(modelName: string, ability: AppAbilityType, whereId: string, select: Record<string, boolean>): Promise<EntityType>;
  deleteMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, where: WhereInputType, select: Record<string, boolean>): Promise<EntityType[]>;
}
```

The built-in `PrismaDataProvider`:
- Integrates with Prisma ORM for database operations
- Applies CASL authorization rules directly in database queries using `accessibleBy`
- Handles transactions and entity fetching optimally
- **NEW**: Supports advanced query features like cursor pagination, complex ordering, and distinct queries

### Field Selection

The `FieldSelectionProvider` optimizes performance by ensuring only requested GraphQL fields are fetched:

```typescript
interface FieldSelectionProvider {
  parseSelection<EntityType>(info: GraphQLResolveInfo): FieldSelectionResult<EntityType>;
}
```

The built-in `PrismaFieldSelectionProvider`:
- Uses `@paljs/plugins` to convert GraphQL selections to Prisma `select` objects
- Handles nested field selection for relations
- Prevents overfetching of data from the database

### Advanced Query Features

The library now supports two query modes:

#### 1. Simple Mode (Default)
Uses basic `take`/`skip` pagination:
```typescript
// No additional configuration needed
CrudModulesFactory.forEntity(User).withConfig({...})
```

#### 2. Advanced Mode (Opt-in)
Supports full Prisma-style querying:
```typescript
// Enable advanced features
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  .withFindManyArgs(FindManyUserArgs) // Generated by prisma-nest-graphql
```

**Advanced mode enables:**
- **Cursor-based pagination**: More efficient for large datasets
- **Complex ordering**: Multiple field sorting with direction
- **Distinct queries**: Remove duplicates based on specific fields
- **Relay pagination patterns**: Standards-compliant pagination

### Relation Resolvers

The library supports three types of entity relationships:

1. **One-to-Many Relations** (`addRelation`):
   ```typescript
   .addRelation({
     fieldName: 'posts',         // GraphQL field name
     targetModel: 'post',        // Target Prisma model name
     targetType: Post,           // Target entity class
     targetWhereInput: PostWhere, // Optional filter input
     whereNullable: true,        // Is filter optional?
     relationField: 'authorId'   // Foreign key on target
   })
   ```

2. **One-to-One Relations** (`addOneToOneRelation`):
   ```typescript
   .addOneToOneRelation({
     fieldName: 'profile',      // GraphQL field name
     targetModel: 'profile',    // Target Prisma model name
     targetType: Profile,       // Target entity class
     relationField: 'profileId' // Foreign key on parent entity
   })
   ```

3. **Custom Relations** (`addCustomRelation` / `addCustomArrayRelation`):
    - For many-to-many relations requiring join tables
    - For computed or virtual relations
    - Uses a custom resolver class implementing `CustomRelationResolver`:
   ```typescript
   interface CustomRelationResolver<Item, Target, WhereInput> {
     resolve(ability: AppAbilityType, item: Item, context: any, args?: FindManyContract<WhereInput>): Promise<Target | Target[]>;
   }
   ```

### Authorization

The library integrates with `@eleven-am/authorizer` (based on CASL) for access control:

- Applies `@CanPerform` decorators to all generated resolvers automatically
- Maps GraphQL operations to CASL actions:
    - Queries → `Action.Read`
    - Create mutations → `Action.Create`
    - Update mutations → `Action.Update`
    - Delete mutations → `Action.Delete`
- Uses the current user's ability context within data provider operations
- Translates CASL rules to database filters (e.g., in Prisma provider)

### Subscriptions

Real-time updates via GraphQL subscriptions are built in:

- Each entity gets a subscription resolver that emits events on entity changes
- Uses `graphql-subscriptions` package's `PubSub` implementation
- Services automatically publish events for create/update/delete operations
- Optional custom filtering using `SubscriptionResolver` interface:
  ```typescript
  interface SubscriptionResolver<EntityType, FilterType> {
    filter(filter: FilterType, changes: EntityType[]): boolean;
    resolve(filter: FilterType, changes: EntityType[]): Promise<EntityType[]>;
  }
  ```

### Type Inference

The library leverages TypeScript's type inference system:

- Types flow naturally between entity definitions, input types, and resolved outputs
- No need to specify generic type parameters in most cases
- Configuration objects maintain type safety while minimizing verbosity
- Provides strong typing for returned entity objects in your application code

## 🔄 Migration Guide

### Upgrading to Advanced Query Support

If you're upgrading from a previous version and want to use advanced query features:

#### Option 1: Keep existing behavior (no changes required)
Your existing code will continue to work exactly as before:

```typescript
// This continues to work with take/skip pagination
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
```

#### Option 2: Upgrade to advanced features
Add the `withFindManyArgs()` method to enable advanced query features:

```typescript
// Import your generated FindManyArgs (from prisma-nest-graphql or similar)
import { FindManyUserArgs } from './generated/find-many-user.args';

CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
  .withFindManyArgs(FindManyUserArgs) // 🎉 Add this line
```

#### Update your DataProvider (if custom)
If you have a custom `DataProvider` implementation, update the `findMany` method signature to support the new parameters:

```typescript
// Before
async findMany<EntityType, WhereInputType>(
  modelName: string,
  ability: AppAbilityType,
  args: { where: WhereInputType; pagination?: PaginationContract },
  select: Record<string, boolean>
): Promise<EntityType[]>

// After
async findMany<EntityType, WhereInputType>(
  modelName: string,
  ability: AppAbilityType,
  args: {
    where: WhereInputType;
    pagination?: PaginationContract;
    orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
    cursor?: any;
    distinct?: string[];
  },
  select: Record<string, boolean>
): Promise<EntityType[]>
```

The built-in `PrismaDataProvider` already supports these features automatically.

## 🔧 Tool Integration

### Working with prisma-nest-graphql

This library works seamlessly with `prisma-nest-graphql` for a complete code generation workflow:

1. **Generate Prisma schema artifacts:**
```bash
npx prisma generate
```

2. **Generate NestJS GraphQL classes:**
```bash
# Using prisma-nest-graphql generator
# Generates entity classes, input types, and FindManyArgs classes
```

3. **Configure CRUD modules with generated types:**
```typescript
// All these types are auto-generated by prisma-nest-graphql
import { User } from './generated/user/user.model';
import { UserCreateInput } from './generated/user/user-create.input';
import { UserUpdateInput } from './generated/user/user-update.input';
import { UserUpdateManyMutationInput } from './generated/user/user-update-many-mutation.input';
import { UserWhereInput } from './generated/user/user-where.input';
import { FindManyUserArgs } from './generated/user/find-many-user.args';

CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyMutationInput,
    whereInput: UserWhereInput,
  })
  .withFindManyArgs(FindManyUserArgs) // Generated FindManyArgs with full Prisma features
```

### Working with GraphQL Code First

For code-first GraphQL development without generators:

```typescript
// Define your own FindManyArgs if desired
@ArgsType()
export class CustomUserFindManyArgs {
  @Field(() => UserWhereInput, { nullable: true })
  where?: UserWhereInput;

  @Field(() => [UserOrderByInput], { nullable: true })
  orderBy?: UserOrderByInput[];

  @Field(() => UserWhereUniqueInput, { nullable: true })
  cursor?: UserWhereUniqueInput;

  @Field(() => Int, { nullable: true })
  take?: number;

  @Field(() => Int, { nullable: true })
  skip?: number;

  @Field(() => [UserScalarFieldEnum], { nullable: true })
  distinct?: UserScalarFieldEnum[];
}

// Use in configuration
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  .withFindManyArgs(CustomUserFindManyArgs)
```

## 🎯 Use Cases

### E-commerce Platform
```typescript
// Product catalog with advanced filtering and relations
CrudModulesFactory.forEntity(Product)
  .withConfig({
    modelName: 'product',
    createInput: ProductCreateInput,
    updateInput: ProductUpdateInput,
    updateManyInput: ProductUpdateManyInput,
    whereInput: ProductWhereInput,
  })
  .withFindManyArgs(FindManyProductArgs) // Enable complex filtering, sorting
  .addRelation({
    fieldName: 'reviews',
    targetModel: 'review',
    targetType: Review,
    targetWhereInput: ReviewWhereInput,
    whereNullable: true,
    relationField: 'productId'
  })
  .addOneToOneRelation({
    fieldName: 'category',
    targetModel: 'category',
    targetType: Category,
    relationField: 'categoryId'
  })
  .withCustomResolver(ProductBusinessLogic)
    .addQuery({
      name: 'searchProducts',
      methodName: 'search',
      inputType: ProductSearchInput,
      outputType: () => [Product],
      permissions: [{ action: Action.Read, resource: 'Product' }]
    })
    .addResolveField({
      name: 'getAverageRating',
      methodName: 'calculateAverageRating',
      resolveField: 'averageRating',
      outputType: () => Number,
      permissions: [{ action: Action.Read, resource: 'Product' }]
    })
    .and()
```

### Social Media Platform
```typescript
// User profiles with complex friend relationships
CrudModulesFactory.forEntity(User)
  .withConfig({
    modelName: 'user',
    createInput: UserCreateInput,
    updateInput: UserUpdateInput,
    updateManyInput: UserUpdateManyInput,
    whereInput: UserWhereInput,
  })
  .withFindManyArgs(FindManyUserArgs)
  .addRelation({
    fieldName: 'posts',
    targetModel: 'post',
    targetType: Post,
    targetWhereInput: PostWhereInput,
    whereNullable: true,
    relationField: 'authorId'
  })
  .addCustomArrayRelation({
    fieldName: 'friends',
    targetModel: 'user',
    targetType: User,
    targetWhereInput: UserWhereInput,
    whereNullable: true,
    factoryClass: UserFriendsResolver // Custom many-to-many logic
  })
  .withSubscription({
    filter: UserActivityFilter,
    resolver: UserActivitySubscriptionResolver
  })
```

### Content Management System
```typescript
// Blog posts with advanced publishing workflow
CrudModulesFactory.forEntity(BlogPost)
  .withConfig({
    modelName: 'blogPost',
    createInput: BlogPostCreateInput,
    updateInput: BlogPostUpdateInput,
    updateManyInput: BlogPostUpdateManyInput,
    whereInput: BlogPostWhereInput,
  })
  .withFindManyArgs(FindManyBlogPostArgs) // Complex filtering by tags, categories, status
  .withCustomResolver(BlogPostWorkflow)
    .addMutation({
      name: 'publishPost',
      methodName: 'publish',
      inputType: PublishPostInput,
      outputType: () => BlogPost,
      permissions: [{ action: Action.Update, resource: 'BlogPost' }]
    })
    .addMutation({
      name: 'schedulePost',
      methodName: 'schedule',
      inputType: SchedulePostInput,
      outputType: () => BlogPost,
      permissions: [{ action: Action.Update, resource: 'BlogPost' }]
    })
    .addQuery({
      name: 'getAnalytics',
      methodName: 'getPostAnalytics',
      inputType: AnalyticsInput,
      outputType: () => PostAnalytics,
      permissions: [{ action: Action.Read, resource: 'BlogPost' }]
    })
    .and()
```

## 📊 Performance Considerations

### Field Selection Optimization
The library automatically optimizes database queries by only selecting requested GraphQL fields:

```graphql
# This query...
query {
  userFindMany {
    id
    name
    posts {
      title
    }
  }
}

# ...translates to optimized Prisma query:
# prisma.user.findMany({
#   select: {
#     id: true,
#     name: true,
#     posts: {
#       select: {
#         title: true
#       }
#     }
#   }
# })
```

### Cursor Pagination for Large Datasets
When using `withFindManyArgs()`, leverage cursor-based pagination for better performance:

```graphql
query {
  userFindMany(
    cursor: { id: "last_user_id" }
    take: 20
    orderBy: [{ createdAt: desc }]
  ) {
    id
    name
    createdAt
  }
}
```

### Authorization Query Optimization
CASL rules are applied at the database level, not in application memory:

```typescript
// Authorization rules become database WHERE conditions
// Instead of fetching all records and filtering in memory,
// the query becomes:
// SELECT * FROM users WHERE role != 'ADMIN' AND team_id = current_user.team_id
```

## 🐛 Troubleshooting

### Common Issues

#### 1. "Custom resolver class not registered" Error
Make sure to call `withCustomResolver()` before adding custom resolvers:
```typescript
// ❌ Wrong
.addQuery({...}) // Error: no custom resolver registered

// ✅ Correct
.withCustomResolver(MyResolverClass)
  .addQuery({...})
```

#### 2. Field Selection Not Working
Ensure your `DataProvider` uses the `select` parameter:
```typescript
// ❌ Wrong - ignores field selection
async findMany(modelName: string, ability: any, args: any, select: any) {
  return this.prisma[modelName].findMany({
    where: args.where
    // Missing: ...select
  });
}

// ✅ Correct - applies field selection
async findMany(modelName: string, ability: any, args: any, select: any) {
  return this.prisma[modelName].findMany({
    where: args.where,
    ...select // Apply field selection for optimization
  });
}
```

#### 3. Advanced Query Features Not Working
Make sure you've added `withFindManyArgs()` and updated your `DataProvider`:
```typescript
// ❌ Wrong - missing configuration
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  // Missing .withFindManyArgs()

// ✅ Correct - enables advanced features
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  .withFindManyArgs(FindManyUserArgs)
```

#### 4. Authorization Not Working
Verify your authorization setup:
```typescript
// Ensure you have authorization providers
.withAuthorization(UserPolicies)

// And that your DataProvider applies CASL rules
const accessibleRecords = accessibleBy(ability, Action.Read).user;
```

## 📄 License

MIT

## 👤 Author

Roy OSSAI

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please open an issue on the GitHub repository to discuss changes.

## 📞 Support

For questions or support, please open an issue on the GitHub repository.
