import { Test, TestingModule } from '@nestjs/testing';
import { TemplateEngineService } from '../../../src/parser/template.engine.service';

describe('TemplateEngineService', () => {
  let service: TemplateEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TemplateEngineService],
    }).compile();

    service = module.get<TemplateEngineService>(TemplateEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processTemplate', () => {
    it('should replace basic variables', () => {
      const template = 'Hello ${name}, welcome to ${project}!';
      const variables = { name: 'John', project: 'Claude Auto Worker' };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toBe('Hello John, welcome to Claude Auto Worker!');
    });

    it('should replace context variables', () => {
      const template = 'Previous result: ${step1.content}';
      const variables = {};
      const context = { step1: { content: 'Hello World' } };
      
      const result = service.processTemplate(template, variables, context);
      
      expect(result).toBe('Previous result: Hello World');
    });

    it('should handle nested object properties', () => {
      const template = 'User: ${user.name}, Age: ${user.age}';
      const variables = { user: { name: 'Alice', age: 30 } };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toBe('User: Alice, Age: 30');
    });

    it('should process conditional logic', () => {
      const template = '{{#if enabled}}Feature is enabled{{/if}}';
      const variables = { enabled: true };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toBe('Feature is enabled');
    });

    it('should skip conditional content when condition is false', () => {
      const template = '{{#if enabled}}Feature is enabled{{/if}}';
      const variables = { enabled: false };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toBe('');
    });

    it('should process loops', () => {
      const template = '{{#each items}}{{this}}, {{/each}}';
      const variables = { items: ['apple', 'banana', 'orange'] };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toBe('apple, banana, orange, ');
    });

    it('should handle complex nested templates', () => {
      const template = `
        Hello ${name}!
        {{#if hasItems}}
          Your items:
          {{#each items}}
            - ${this.name}: ${this.price}
          {{/each}}
        {{/if}}
      `;
      
      const variables = {
        name: 'John',
        hasItems: true,
        items: [
          { name: 'Book', price: '$20' },
          { name: 'Pen', price: '$5' }
        ]
      };
      
      const result = service.processTemplate(template, variables);
      
      expect(result).toContain('Hello John!');
      expect(result).toContain('- Book: $20');
      expect(result).toContain('- Pen: $5');
    });
  });

  describe('validateTemplate', () => {
    it('should validate valid template', () => {
      const template = 'Hello ${name}!';
      const result = service.validateTemplate(template);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect unmatched braces', () => {
      const template = 'Hello ${name!';
      const result = service.validateTemplate(template);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unmatched braces in template');
    });

    it('should detect unmatched if tags', () => {
      const template = '{{#if condition}}Content{{/if}}';
      const result = service.validateTemplate(template);
      
      expect(result.isValid).toBe(true);
    });

    it('should detect unmatched each tags', () => {
      const template = '{{#each items}}Item{{/each}}';
      const result = service.validateTemplate(template);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', () => {
      const result = service.processTemplate('', {});
      expect(result).toBe('');
    });

    it('should handle template with no variables', () => {
      const template = 'Static content';
      const result = service.processTemplate(template, {});
      expect(result).toBe(template);
    });

    it('should handle undefined variables gracefully', () => {
      const template = 'Hello ${name}!';
      const result = service.processTemplate(template, {});
      expect(result).toBe('Hello ${name}!');
    });

    it('should handle null values', () => {
      const template = 'Value: ${value}';
      const variables = { value: null };
      const result = service.processTemplate(template, variables);
      expect(result).toBe('Value: null');
    });
  });
});
