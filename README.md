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

## 🛠 Advanced Usage

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
    authorizer: UserPolicies,  // Link your custom authorizer
  })
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

Example of a complex entity with multiple relation types:

```typescript
CrudModulesFactory.forEntity(BlogPost)
  .withConfig({
    modelName: 'blogPost',
    createInput: BlogPostCreateInput,
    updateInput: BlogPostUpdateInput,
    updateManyInput: BlogPostUpdateManyInput,
    whereInput: BlogPostWhereInput,
  })
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
  // Custom subscription filtering
  .withSubscription({
    filter: BlogPostSubscriptionFilter,
    resolver: BlogPostSubscriptionResolver
  })
```

### Custom Relation Resolvers

For complex relation scenarios, you can implement custom resolvers:

```typescript
@Injectable()
class UserPostsResolver implements CustomRelationResolver {
  constructor(private postService: PostService) {}
  
  async resolve(ability: AppAbilityType, user: User, context: any, args?: any) {
    // Custom logic to fetch posts for a user
    return this.postService.findFeaturedPostsForUser(user.id, args?.where, args?.pagination);
  }
}

// Use in configuration:
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  .addCustomArrayRelation({
    fieldName: 'featuredPosts',
    targetModel: 'post',
    targetType: Post,
    targetWhereInput: PostWhereInput,
    whereNullable: true,
    factoryClass: UserPostsResolver
  })
```

### Custom Subscription Handling

You can customize how subscription events are filtered and processed:

```typescript
@InputType()
class UserSubscriptionFilter {
  @Field(() => [String])
  specificUserIds: string[];
  
  @Field(() => Boolean, { nullable: true })
  includeAdmins?: boolean;
}

@Injectable()
class UserSubscriptionResolver implements SubscriptionResolver {
  filter(filter: UserSubscriptionFilter, changes: any[]) {
    // Return true if subscription should receive this update
    return changes.some(user => 
      filter.specificUserIds.includes(user.id) || 
      (filter.includeAdmins && user.role === 'ADMIN')
    );
  }
  
  async resolve(filter: UserSubscriptionFilter, changes: any[]) {
    // Transform the data before sending to subscribers
    return changes.map(user => ({ ...user, lastUpdated: new Date() }));
  }
}

// Use in configuration:
CrudModulesFactory.forEntity(User)
  .withConfig({...})
  .withSubscription({
    filter: UserSubscriptionFilter,
    resolver: UserSubscriptionResolver
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
  findMany<EntityType, WhereInputType>(modelName: string, ability: AppAbilityType, args: QueryOptions<WhereInputType>, select: Record<string, boolean>): Promise<EntityType[]>;
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

## 📄 License

MIT

## 👤 Author

Roy OSSAI

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please open an issue on the GitHub repository to discuss changes.

## 📞 Support

For questions or support, please open an issue on the GitHub repository.