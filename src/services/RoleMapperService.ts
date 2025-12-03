import { injectable, singleton } from 'tsyringe';
import { ConfigService } from '.';

const ROLE_DIVIDE = ';';
const ROLE_EQUAL = '=>';

@singleton()
export class RoleMapperService {
    private readonly roles: { from: string; to: string }[];

    constructor(configService?: ConfigService) {
        this.roles = this.getMapper(configService);
    }

    map(from: string[]) {
        const to: string[] = [];

        if (!from || !Array.isArray(from) || !from[0]) {
            return to;
        }

        from.forEach((role) => {
            const result = this.roles.find((x) => x.from === role)?.to;
            if (result) {
                to.push(result);
            }
        });

        return to;
    }

    unmappedRoles(): string[] {
        return this.roles.map((x) => x.from);
    }

    private getMapper(
        configService: ConfigService
    ): { from: string; to: string }[] {
        var roleMapper = configService.get('ROLES_MAPPER');
        if (!roleMapper) {
            throw new Error('ROLES_MAPPER not defined in .env file.');
        }
        return roleMapper.split(ROLE_DIVIDE).map((x: string) => {
            const c = x.split(ROLE_EQUAL);
            if (!c || !Array.isArray(c) || c.length != 2) {
                throw new Error('Invalid ROLES_MAPPER format. ');
            }
            return { from: c[0], to: c[1] };
        });
    }
}
