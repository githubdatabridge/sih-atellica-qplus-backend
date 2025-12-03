import * as Joi from 'joi';

const userResponse = Joi.object({
    name: Joi.string().optional(),
    id: Joi.string().optional(),
    userId: Joi.string().optional(),
    userDirectory: Joi.string().optional(),
    email: Joi.string().optional().allow('').default(''),
    status: Joi.string().optional(),
    roles: Joi.array().optional(),
}).label('UserResponse');

const usersResponse = Joi.array()
    .items(userResponse)
    .required()
    .empty()
    .label('UsersResponse');

export { usersResponse, userResponse };
