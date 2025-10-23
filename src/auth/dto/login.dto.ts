import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength, Validate } from 'class-validator';
import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

@ValidatorConstraint({ name: 'emailOrPhone', async: false })
class EmailOrPhone implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments) {
    const { email, phone } = args.object as any;
    return Boolean((email && String(email).trim()) || (phone && String(phone).trim()));
  }
  defaultMessage() {
    return 'Either email or phone must be provided';
  }
}

export class LoginDto {
  @ApiPropertyOptional({ example: 'admin@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+998901234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'secret123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @Validate(EmailOrPhone)
  private _atLeastOne!: true; // dummy property to attach the validator
}
