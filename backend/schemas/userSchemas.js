import Joi from "joi";

export const registerSchema = Joi.object({
    registrationKey: Joi.string().required().messages({
        "any.required": "Registration key is required",
        "string.empty": "Registration key cannot be empty",
    }),
    name: Joi.string().required().messages({
        "any.required": "Name is required",
        "string.empty": "Name cannot be empty",
    }),
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
        "string.min": "Password must be at least 6 characters long",
        "any.required": "Password is required",
    }),
    confirmPassword: Joi.string()
        .valid(Joi.ref("password"))
        .required()
        .messages({
            "any.only": "Passwords do not match",
            "any.required": "Confirm password is required",
        }),
}).unknown(false);

export const loginSchema = Joi.object({
    registrationKey: Joi.string().required().messages({
        "any.required": "Registration key is required",
        "string.empty": "Registration key cannot be empty",
    }),
    email: Joi.string().email().required().messages({
        "string.email": "Invalid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
        "any.required": "Password is required",
        "string.empty": "Password cannot be empty",
    }),
}).unknown(false);
