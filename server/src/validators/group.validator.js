import Joi from 'joi';
import { GROUP_TYPE, GROUP_ROLE } from '../utils/constants.js';

export const createGroup = {
  body: Joi.object().keys({
    name: Joi.string().max(100).required(),
    description: Joi.string().max(500).optional().allow(''),
    type: Joi.string().valid(...Object.values(GROUP_TYPE)).default(GROUP_TYPE.GROUP),
    members: Joi.array().items(Joi.string().hex().length(24)).min(1).optional(), // Initial members
    settings: Joi.object().keys({
      onlyAdminsCanMessage: Joi.boolean().optional(),
      approvalRequired: Joi.boolean().optional(),
      maxMembers: Joi.number().integer().optional(),
      category: Joi.string().optional(),
    }).optional(),
  }),
};

export const updateGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().max(100).optional(),
    description: Joi.string().max(500).optional().allow(''),
    avatar: Joi.string().uri().optional().allow(''),
    settings: Joi.object().keys({
      onlyAdminsCanMessage: Joi.boolean().optional(),
      approvalRequired: Joi.boolean().optional(),
      maxMembers: Joi.number().integer().optional(),
    }).optional(),
  }),
};

export const addMembers = {
  params: Joi.object().keys({
    groupId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    userIds: Joi.array().items(Joi.string().hex().length(24)).min(1).required(),
  }),
};

export const removeMember = {
  params: Joi.object().keys({
    groupId: Joi.string().hex().length(24).required(),
    userId: Joi.string().hex().length(24).required(),
  }),
};

export const changeRole = {
  params: Joi.object().keys({
    groupId: Joi.string().hex().length(24).required(),
    userId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    role: Joi.string().valid(...Object.values(GROUP_ROLE)).required(),
  }),
};

export const joinGroup = {
  params: Joi.object().keys({
    groupId: Joi.string().hex().length(24).required(),
  }),
  body: Joi.object().keys({
    inviteLink: Joi.string().optional().allow(''),
  }),
};
