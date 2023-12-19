import { EmailString } from './emailString';
import validator from 'validator';

jest.mock('validator');

describe('EmailString', () => {
    it('should create an email object for a valid email', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email = new EmailString('test@example.com');
        expect(email.toString()).toBe('test@example.com');
    });

    it('should throw an error for an empty email', () => {
        expect(() => new EmailString('')).toThrow('Email missing');
    });

    it('should throw an error for an email with leading or trailing spaces', () => {
        expect(() => new EmailString(' test@example.com ')).toThrow('Email has leading or trailing spaces');
    });

    it('should throw an error for an invalid email', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(false);
        expect(() => new EmailString('invalid')).toThrow('Email is invalid');
    });

    it('should return true when comparing two identical emails', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email1 = new EmailString('test@example.com');
        const email2 = new EmailString('test@example.com');
        expect(email1.equals(email2)).toBeTruthy();
    });

    it('should return false when comparing two different emails', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email1 = new EmailString('test1@example.com');
        const email2 = new EmailString('test2@example.com');
        expect(email1.equals(email2)).toBeFalsy();
    });

    it('should serialize to JSON correctly', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email = new EmailString('test@example.com');
        expect(email.toJSON()).toBe('test@example.com');
    });

    it('should create an email object from JSON', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email = EmailString.fromJSON('test@example.com');
        expect(email.toString()).toBe('test@example.com');
    });

    it('should return the correct length of the email', () => {
        (validator.isEmail as jest.Mock).mockReturnValue(true);
        const email = new EmailString('test@example.com');
        expect(email.length).toBe(16);
    });
});
