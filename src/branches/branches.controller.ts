import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    ParseIntPipe,
    UseGuards,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags,
    ApiNotFoundResponse,
} from '@nestjs/swagger';
import { ListBranchesDto } from './dto/list-branches.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Branches')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Controller('branches')
export class BranchesController {
    constructor(private readonly branchesService: BranchesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a branch' })
    @ApiCreatedResponse({ description: 'Branch created' })
    create(@Body() dto: CreateBranchDto) {
        return this.branchesService.create(dto);
    }

    @Get()
    @ApiOperation({ summary: 'List branches (paginated)' })
    @ApiOkResponse({
        description: 'List of branches with pagination meta',
    })
    findAll(@Query() query: ListBranchesDto) {
        return this.branchesService.findAll(query);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a branch by id' })
    @ApiOkResponse({ description: 'Branch found' })
    @ApiNotFoundResponse({ description: 'Branch not found' })
    findOne(@Param('id', ParseIntPipe) id: number) {
        return this.branchesService.findOne(id);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a branch' })
    @ApiOkResponse({ description: 'Branch updated' })
    @ApiNotFoundResponse({ description: 'Branch not found' })
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateBranchDto,
    ) {
        return this.branchesService.update(id, dto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a branch' })
    @ApiOkResponse({ description: 'Branch deleted' })
    @ApiNotFoundResponse({ description: 'Branch not found' })
    remove(@Param('id', ParseIntPipe) id: number) {
        return this.branchesService.remove(id);
    }
}
