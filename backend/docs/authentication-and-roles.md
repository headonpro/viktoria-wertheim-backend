# Authentication and User Roles Documentation

## Overview

This document describes the authentication system and user role management implemented for the SV Viktoria Wertheim backend.

## User Roles

### 1. Admin
- **Description**: Full administrative access to all content and system settings
- **Permissions**: Complete CRUD access to all content types
- **Use Case**: System administrators and technical staff

### 2. Redakteur (Editor)
- **Description**: Content editor with access to news, events, and basic team information
- **Permissions**:
  - Read access to most content types
  - Full CRUD access to news articles, events, and categories
  - Update access to team and player information
  - Read-only access to sponsors
- **Use Case**: Content managers and journalists

### 3. Vereinsvorstand (Club Board)
- **Description**: Club board member with access to member data and team management
- **Permissions**:
  - Read access to most content types
  - Full CRUD access to teams, members, players, and sponsors
  - Create/update access to matches and events
  - Limited content management for news
- **Use Case**: Club board members and team managers

### 4. Mitglied (Member)
- **Description**: Club member with limited access to member-only content
- **Permissions**:
  - Read-only access to public content
  - Limited access to own member data
- **Use Case**: Regular club members

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/local
Standard Strapi login endpoint with enhanced functionality:
- Updates `lastLogin` timestamp
- Returns user with role information

#### POST /api/auth/local/register
Standard registration with member linking:
- Optional `memberNumber` parameter to link to existing member
- Automatic role assignment based on member type
- Sets default `displayName`

#### POST /api/auth/register-member
Specialized member registration endpoint:
- Requires valid `memberNumber`
- Links user account to existing member record
- Assigns appropriate role based on member type

#### GET /api/auth/me
Enhanced user profile endpoint:
- Returns user with role information
- Includes linked member data if available
- Excludes sensitive information

#### PUT /api/auth/update-profile
Update user profile information:
- Updates `displayName` and `bio`
- Validates input data

#### POST /api/auth/change-password
Change user password:
- Requires current password verification
- Updates password securely

### User Management Endpoints

#### POST /api/user-management/assign-role
Assign role to user (Admin only):
```json
{
  "userId": 123,
  "roleName": "Redakteur"
}
```

#### GET /api/user-management/user/:id
Get user with role information (Admin only)

#### GET /api/user-management/users/role/:roleName
Get all users with specific role (Admin only)

#### POST /api/user-management/create-user
Create user with specific role (Admin only):
```json
{
  "userData": {
    "username": "newuser",
    "email": "user@example.com",
    "password": "password123"
  },
  "roleName": "Mitglied"
}
```

#### POST /api/user-management/link-member
Link member to user account (Admin only):
```json
{
  "memberId": 456,
  "userId": 123
}
```

#### GET /api/user-management/my-member
Get member data for current user

#### GET /api/user-management/roles
Get all available roles

### User Profile Endpoints

#### GET /api/user-profile
Get current user's full profile with statistics

#### PUT /api/user-profile
Update user profile information

#### POST /api/user-profile/avatar
Upload user avatar (multipart/form-data)

#### DELETE /api/user-profile/avatar
Remove user avatar

#### GET /api/user-profile/stats
Get user activity statistics

#### GET /api/user-profile/preferences
Get user preferences

#### PUT /api/user-profile/preferences
Update user preferences

## User Model Extensions

The default Strapi user model has been extended with:

```json
{
  "displayName": "string (max 100 chars)",
  "avatar": "media (images only)",
  "bio": "text (max 500 chars)",
  "lastLogin": "datetime",
  "isActive": "boolean (default: true)"
}
```

## Role-Based Access Control

### Middleware
- `role-based-access`: Enforces role-based permissions on API endpoints
- `avatar-upload`: Validates avatar uploads (file type, size)

### Policies
- `has-role`: Checks if user has required role(s)
- `is-admin-or-owner`: Allows access for admins or resource owners

### Usage Examples

#### Protecting a route with role requirement:
```javascript
{
  method: 'POST',
  path: '/protected-endpoint',
  handler: 'controller.method',
  config: {
    policies: [
      {
        name: 'global::has-role',
        config: { roles: ['Admin', 'Redakteur'] }
      }
    ],
  },
}
```

#### Protecting a route for admin or owner:
```javascript
{
  method: 'PUT',
  path: '/member/:id',
  handler: 'member.update',
  config: {
    policies: [
      {
        name: 'global::is-admin-or-owner',
        config: { 
          resourceType: 'api::mitglied.mitglied',
          ownerField: 'website_user'
        }
      }
    ],
  },
}
```

## Member-User Linking

Members can be linked to user accounts in two ways:

1. **During Registration**: Provide `memberNumber` during registration
2. **Admin Linking**: Admin can link existing users to members via API

### Benefits of Linking:
- Automatic role assignment based on member type
- Access to member-specific data and features
- Personalized user experience
- Future features like member-only content

## Security Features

1. **Password Validation**: Enforced during registration and password changes
2. **File Upload Validation**: Avatar uploads are validated for type and size
3. **Role-Based Permissions**: API endpoints are protected by role requirements
4. **Data Sanitization**: Sensitive data is excluded from API responses
5. **Audit Logging**: User actions are logged for security monitoring

## Database Migrations

The system includes migrations for:
- Extending user model with additional fields
- Creating indexes for performance
- Setting default values for existing users

## Future Enhancements

Planned features for future releases:
- Two-factor authentication
- OAuth integration (Google, Facebook)
- Advanced permission granularity
- User activity tracking
- Email notifications for account changes
- Password reset functionality improvements

## Testing

To test the authentication system:

1. **Create test users** with different roles
2. **Test role-based access** to various endpoints
3. **Verify member linking** functionality
4. **Test file upload** validation
5. **Check audit logging** functionality

## Troubleshooting

Common issues and solutions:

1. **Role not found**: Ensure roles are created during bootstrap
2. **Permission denied**: Check user role and endpoint permissions
3. **Member linking fails**: Verify member exists and is not already linked
4. **Avatar upload fails**: Check file type, size, and middleware configuration