import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateEngineService {
  /**
   * 프롬프트 템플릿을 처리하고 변수를 치환합니다.
   * @param template 템플릿 문자열
   * @param variables 치환할 변수들
   * @param context 추가 컨텍스트 (이전 단계 결과 등)
   * @returns 처리된 템플릿
   */
  processTemplate(
    template: string,
    variables: Record<string, unknown> = {},
    context: Record<string, unknown> = {}
  ): string {
    let result = template;

    // 기본 변수 치환
    result = this.replaceVariables(result, variables);
    
    // 컨텍스트 변수 치환 (이전 단계 결과 등)
    result = this.replaceContextVariables(result, context);
    
    // 조건부 로직 처리
    result = this.processConditionals(result, variables, context);
    
    // 반복문 처리
    result = this.processLoops(result, variables, context);

    return result;
  }

  /**
   * 기본 변수를 치환합니다.
   * ${variable_name} 형태의 변수를 실제 값으로 치환
   */
  private replaceVariables(
    template: string,
    variables: Record<string, unknown>
  ): string {
    return template.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      const value = this.getNestedValue(variables, varName.trim());
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 컨텍스트 변수를 치환합니다.
   * ${step_name.content} 형태의 이전 단계 결과를 치환
   */
  private replaceContextVariables(
    template: string,
    context: Record<string, unknown>
  ): string {
    return template.replace(/\$\{([^}]+)\.([^}]+)\}/g, (match, stepName, property) => {
      const stepResult = context[stepName];
      if (stepResult && typeof stepResult === 'object') {
        const value = (stepResult as Record<string, unknown>)[property];
        return value !== undefined ? String(value) : match;
      }
      return match;
    });
  }

  /**
   * 조건부 로직을 처리합니다.
   * {{#if condition}}...{{/if}} 형태의 조건문 처리
   */
  private processConditionals(
    template: string,
    variables: Record<string, unknown>,
    context: Record<string, unknown>
  ): string {
    // 간단한 if 조건문 처리
    return template.replace(
      /\{\{#if\s+([^}]+)\}\}(.*?)\{\{\/if\}\}/gs,
      (match, condition, content) => {
        if (this.evaluateCondition(condition, variables, context)) {
          return content;
        }
        return '';
      }
    );
  }

  /**
   * 반복문을 처리합니다.
   * {{#each array}}...{{/each}} 형태의 반복문 처리
   */
  private processLoops(
    template: string,
    variables: Record<string, unknown>,
    context: Record<string, unknown>
  ): string {
    return template.replace(
      /\{\{#each\s+([^}]+)\}\}(.*?)\{\{\/each\}\}/gs,
      (match, arrayName, content) => {
        const array = this.getNestedValue(variables, arrayName.trim()) || 
                     this.getNestedValue(context, arrayName.trim());
        
        if (Array.isArray(array)) {
          return array.map(item => {
            let itemContent = content;
            // {{this}} 를 현재 아이템으로 치환
            itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
            // {{this.property}} 형태도 처리
            if (typeof item === 'object' && item !== null) {
              itemContent = itemContent.replace(/\{\{this\.([^}]+)\}\}/g, (match: string, prop: string) => {
                return (item as Record<string, unknown>)[prop] !== undefined 
                  ? String((item as Record<string, unknown>)[prop]) 
                  : match;
              });
            }
            return itemContent;
          }).join('\n');
        }
        return '';
      }
    );
  }

  /**
   * 중첩된 객체에서 값을 가져옵니다.
   * "user.profile.name" 형태의 경로로 중첩된 값에 접근
   */
  private getNestedValue(
    obj: Record<string, unknown>,
    path: string
  ): unknown {
    return path.split('.').reduce((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj as unknown);
  }

  /**
   * 조건식을 평가합니다.
   * 간단한 비교 연산자 지원
   */
  private evaluateCondition(
    condition: string,
    variables: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    // 변수 존재 여부 확인
    if (condition.includes('exists:')) {
      const varName = condition.replace('exists:', '').trim();
      return this.getNestedValue(variables, varName) !== undefined ||
             this.getNestedValue(context, varName) !== undefined;
    }

    // 변수 값 확인
    if (condition.includes('==')) {
      const [varName, value] = condition.split('==').map(s => s.trim());
      if (varName && value !== undefined) {
        const actualValue = this.getNestedValue(variables, varName) ||
                           this.getNestedValue(context, varName);
        return String(actualValue) === value;
      }
      return false;
    }

    // 변수가 truthy한지 확인
    const conditionVarName = condition.trim();
    if (conditionVarName) {
      const value = this.getNestedValue(variables, conditionVarName) ||
                    this.getNestedValue(context, conditionVarName);
      return Boolean(value);
    }
    return false;
  }

  /**
   * 템플릿의 유효성을 검사합니다.
   */
  validateTemplate(template: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // ${} 변수 중괄호 짝 맞추기 검사 (템플릿 태그와 구분)
    const variableOpenBraces = (template.match(/\$\{/g) || []).length;
    const variableCloseBraces = (template.match(/\$\{[^}]*\}/g) || []).length;
    if (variableOpenBraces !== variableCloseBraces) {
      errors.push('Unmatched variable braces in template');
    }

    // {{}} 템플릿 태그 중괄호 짝 맞추기 검사
    const templateOpenBraces = (template.match(/\{\{/g) || []).length;
    const templateCloseBraces = (template.match(/\}\}/g) || []).length;
    if (templateOpenBraces !== templateCloseBraces) {
      errors.push('Unmatched template braces in template');
    }

    // 조건문 짝 맞추기 검사
    const ifCount = (template.match(/\{\{#if/g) || []).length;
    const endIfCount = (template.match(/\{\{\/if\}\}/g) || []).length;
    if (ifCount !== endIfCount) {
      errors.push('Unmatched if/endif tags in template');
    }

    // 반복문 짝 맞추기 검사
    const eachCount = (template.match(/\{\{#each/g) || []).length;
    const endEachCount = (template.match(/\{\{\/each\}\}/g) || []).length;
    if (eachCount !== endEachCount) {
      errors.push('Unmatched each/endeach tags in template');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
