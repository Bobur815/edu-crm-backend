

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
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@ApiTags('Categories')
@ApiBearerAuth() // keep if protected by JWT (recommended)
@Controller('course-categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a course category' })
  @ApiCreatedResponse({ description: 'Category created' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List categories' })
  @ApiQuery({
    name: 'branchId',
    required: false,
    type: Number,
    description: 'Filter by branchId',
  })
  @ApiOkResponse({ description: 'Array of categories' })
  findAll(@Query('branchId') branchId?: string) {
    const id = branchId ? Number(branchId) : undefined;
    return this.categories.findAll(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  @ApiOkResponse({ description: 'Category found' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categories.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiOkResponse({ description: 'Category updated' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiOkResponse({ description: 'Category deleted' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categories.remove(id);
  }
}
