import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService, NotificationService, SharedModule } from '@vendure/admin-ui/core';
import { gql } from 'graphql-tag';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

// Fragment type for the nutrition batch entity
interface NutritionBatchFragment {
  id: string;
  batchCode: string;
  productionDate?: string;
  expiryDate?: string;
  isCurrentForWebsite: boolean;
  servingSizeValue: number;
  servingSizeUnit: string;
  servingLabel: any;
  servingsPerContainer?: number;
  notesInternal?: string;
  coaAsset?: any;
  ingredientsText?: any;
  allergyAdviceText?: any;
  recommendedUseText?: any;
  storageAdviceText?: any;
  warningsText?: any;
  shortLabelDescription?: any;
  referenceIntakeFootnoteText?: any;
  rows: Array<{
    id: string;
    name: any;
    group: string;
    unit: string;
    valuePerServing?: number;
    valuePer100g?: number;
    referenceIntakePercentPerServing?: number;
    displayOrder: number;
  }>;
}

const GET_BATCH = gql`
  query GetNutritionBatch($id: ID!) {
    nutritionBatch(id: $id) {
      id
      batchCode
      productionDate
      expiryDate
      isCurrentForWebsite
      servingSizeValue
      servingSizeUnit
      servingLabel
      servingsPerContainer
      notesInternal
      coaAsset {
        id
        preview
      }
      ingredientsText
      allergyAdviceText
      recommendedUseText
      storageAdviceText
      warningsText
      shortLabelDescription
      referenceIntakeFootnoteText
      rows {
        id
        name
        group
        unit
        valuePerServing
        valuePer100g
        referenceIntakePercentPerServing
        displayOrder
      }
    }
  }
`;

const CREATE_BATCH = gql`
  mutation CreateNutritionBatch($input: CreateNutritionBatchInput!) {
    createNutritionBatch(input: $input) {
      id
      batchCode
    }
  }
`;

const UPDATE_BATCH = gql`
  mutation UpdateNutritionBatch($id: ID!, $input: UpdateNutritionBatchInput!) {
    updateNutritionBatch(id: $id, input: $input) {
      id
      batchCode
    }
  }
`;

const CREATE_ROW = gql`
  mutation CreateNutritionBatchRow($batchId: ID!, $input: CreateNutritionBatchRowInput!) {
    createNutritionBatchRow(batchId: $batchId, input: $input) {
      id
    }
  }
`;

const UPDATE_ROW = gql`
  mutation UpdateNutritionBatchRow($id: ID!, $input: UpdateNutritionBatchRowInput!) {
    updateNutritionBatchRow(id: $id, input: $input) {
      id
    }
  }
`;

const DELETE_ROW = gql`
  mutation DeleteNutritionBatchRow($id: ID!) {
    deleteNutritionBatchRow(id: $id) {
      result
    }
  }
`;

const CREATE_DEFAULT_MACROS = gql`
  mutation CreateDefaultMacroRows($batchId: ID!) {
    createDefaultMacroRows(batchId: $batchId) {
      id
      name
      group
    }
  }
`;

@Component({
  selector: 'nutrition-batch-detail',
  standalone: true,
  imports: [CommonModule, SharedModule, ReactiveFormsModule, RouterModule],
  template: `
    <vdr-page-block>
      <vdr-action-bar>
        <vdr-ab-left>
          <vdr-page-title
            [title]="isNew ? ('nutrition-batch.create-batch' | translate) : batch?.batchCode"
          ></vdr-page-title>
        </vdr-ab-left>
        <vdr-ab-right>
          <button class="btn btn-secondary" (click)="cancel()">
            {{ 'common.cancel' | translate }}
          </button>
          <button
            class="btn btn-primary"
            (click)="save()"
            [disabled]="batchForm.invalid || saving"
          >
            <clr-icon shape="floppy" *ngIf="!saving"></clr-icon>
            <span *ngIf="saving" class="spinner spinner-inline"></span>
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </vdr-ab-right>
      </vdr-action-bar>
    </vdr-page-block>

    <form [formGroup]="batchForm" *ngIf="!loading">
      <!-- Batch Info Section -->
      <vdr-page-block>
        <vdr-card [title]="'nutrition-batch.batch-info' | translate">
          <div class="clr-row">
            <div class="clr-col-md-6">
              <vdr-form-field [label]="'nutrition-batch.batch-code' | translate" for="batchCode">
                <input
                  id="batchCode"
                  type="text"
                  formControlName="batchCode"
                  class="clr-input"
                  [placeholder]="'nutrition-batch.batch-code-placeholder' | translate"
                />
              </vdr-form-field>
            </div>
            <div class="clr-col-md-3">
              <vdr-form-field [label]="'nutrition-batch.production-date' | translate" for="productionDate">
                <vdr-datetime-picker
                  id="productionDate"
                  formControlName="productionDate"
                ></vdr-datetime-picker>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-3">
              <vdr-form-field [label]="'nutrition-batch.expiry-date' | translate" for="expiryDate">
                <vdr-datetime-picker
                  id="expiryDate"
                  formControlName="expiryDate"
                ></vdr-datetime-picker>
              </vdr-form-field>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-6">
              <label class="clr-control-label">
                <input
                  type="checkbox"
                  clrCheckbox
                  formControlName="isCurrentForWebsite"
                />
                {{ 'nutrition-batch.current-for-website' | translate }}
              </label>
              <p class="help-text">{{ 'nutrition-batch.current-for-website-help' | translate }}</p>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-form-field [label]="'nutrition-batch.internal-notes' | translate" for="notesInternal">
                <textarea
                  id="notesInternal"
                  formControlName="notesInternal"
                  class="clr-textarea"
                  rows="3"
                  [placeholder]="'nutrition-batch.internal-notes-placeholder' | translate"
                ></textarea>
              </vdr-form-field>
            </div>
          </div>

        </vdr-card>
      </vdr-page-block>

      <!-- Serving Section -->
      <vdr-page-block>
        <vdr-card [title]="'nutrition-batch.serving-info' | translate">
          <div class="clr-row">
            <div class="clr-col-md-3">
              <vdr-form-field [label]="'nutrition-batch.serving-size-value' | translate" for="servingSizeValue">
                <input
                  id="servingSizeValue"
                  type="number"
                  formControlName="servingSizeValue"
                  class="clr-input"
                  step="0.1"
                  min="0"
                />
              </vdr-form-field>
            </div>
            <div class="clr-col-md-3">
              <vdr-form-field [label]="'nutrition-batch.serving-size-unit' | translate" for="servingSizeUnit">
                <select id="servingSizeUnit" formControlName="servingSizeUnit" class="clr-select">
                  <option value="g">g (grams)</option>
                  <option value="ml">ml (milliliters)</option>
                  <option value="tablet">Tablet</option>
                  <option value="capsule">Capsule</option>
                  <option value="scoop">Scoop</option>
                  <option value="sachet">Sachet</option>
                  <option value="dosette">Dosette</option>
                  <option value="piece">Piece</option>
                  <option value="serving">Serving</option>
                </select>
              </vdr-form-field>
            </div>
            <div class="clr-col-md-3">
              <vdr-form-field [label]="'nutrition-batch.servings-per-container' | translate" for="servingsPerContainer">
                <input
                  id="servingsPerContainer"
                  type="number"
                  formControlName="servingsPerContainer"
                  class="clr-input"
                  min="1"
                />
              </vdr-form-field>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-form-field [label]="'nutrition-batch.serving-label' | translate" for="servingLabel">
                <input
                  id="servingLabel"
                  type="text"
                  formControlName="servingLabel"
                  class="clr-input"
                  [placeholder]="'nutrition-batch.serving-label-placeholder' | translate"
                />
                <p class="help-text">{{ 'nutrition-batch.serving-label-help' | translate }}</p>
              </vdr-form-field>
            </div>
          </div>
        </vdr-card>
      </vdr-page-block>

      <!-- Nutrition Table Section -->
      <vdr-page-block>
        <vdr-card [title]="'nutrition-batch.nutrition-table' | translate">
          <div class="table-actions">
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              (click)="addDefaultMacros()"
              [disabled]="isNew"
            >
              <clr-icon shape="add"></clr-icon>
              {{ 'nutrition-batch.add-default-macros' | translate }}
            </button>
            <button
              type="button"
              class="btn btn-sm btn-secondary"
              (click)="addNutritionRow()"
            >
              <clr-icon shape="plus"></clr-icon>
              {{ 'nutrition-batch.add-row' | translate }}
            </button>
          </div>

          <table class="table nutrition-table" formArrayName="rows">
            <thead>
              <tr>
                <th>{{ 'nutrition-batch.nutrient-name' | translate }}</th>
                <th>{{ 'nutrition-batch.group' | translate }}</th>
                <th>{{ 'nutrition-batch.unit' | translate }}</th>
                <th>{{ 'nutrition-batch.per-serving' | translate }}</th>
                <th>{{ 'nutrition-batch.per-100g' | translate }}</th>
                <th>{{ 'nutrition-batch.ri-percent' | translate }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of nutritionRows.controls; let i = index" [formGroupName]="i">
                <td>
                  <input type="text" formControlName="name" class="clr-input clr-input-sm" />
                </td>
                <td>
                  <select formControlName="group" class="clr-select clr-select-sm">
                    <option value="macro">Macro</option>
                    <option value="vitamin">Vitamin</option>
                    <option value="mineral">Mineral</option>
                    <option value="amino">Amino Acid</option>
                    <option value="other">Other</option>
                  </select>
                </td>
                <td>
                  <input type="text" formControlName="unit" class="clr-input clr-input-sm" placeholder="g, mg, μg" />
                </td>
                <td>
                  <input type="number" formControlName="valuePerServing" class="clr-input clr-input-sm" step="0.01" />
                </td>
                <td>
                  <input type="number" formControlName="valuePer100g" class="clr-input clr-input-sm" step="0.01" />
                </td>
                <td>
                  <input type="number" formControlName="referenceIntakePercentPerServing" class="clr-input clr-input-sm" step="0.1" />
                </td>
                <td>
                  <button
                    type="button"
                    class="btn btn-icon btn-sm"
                    (click)="removeNutritionRow(i)"
                  >
                    <clr-icon shape="trash"></clr-icon>
                  </button>
                </td>
              </tr>
              <tr *ngIf="nutritionRows.length === 0">
                <td colspan="7" class="text-center text-muted">
                  {{ 'nutrition-batch.no-rows' | translate }}
                </td>
              </tr>
            </tbody>
          </table>
        </vdr-card>
      </vdr-page-block>

      <!-- Regulatory Texts Section -->
      <vdr-page-block>
        <vdr-card [title]="'nutrition-batch.regulatory-texts' | translate">
          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.ingredients-text' | translate"
                formControlName="ingredientsText"
              ></vdr-rich-text-editor>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.allergy-advice-text' | translate"
                formControlName="allergyAdviceText"
              ></vdr-rich-text-editor>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.recommended-use-text' | translate"
                formControlName="recommendedUseText"
              ></vdr-rich-text-editor>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-6">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.storage-advice-text' | translate"
                formControlName="storageAdviceText"
              ></vdr-rich-text-editor>
            </div>
            <div class="clr-col-md-6">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.warnings-text' | translate"
                formControlName="warningsText"
              ></vdr-rich-text-editor>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.short-description' | translate"
                formControlName="shortLabelDescription"
              ></vdr-rich-text-editor>
            </div>
          </div>

          <div class="clr-row">
            <div class="clr-col-md-12">
              <vdr-rich-text-editor
                [label]="'nutrition-batch.ri-footnote-text' | translate"
                formControlName="referenceIntakeFootnoteText"
              ></vdr-rich-text-editor>
            </div>
          </div>
        </vdr-card>
      </vdr-page-block>
    </form>

    <div *ngIf="loading" class="loading-spinner">
      <clr-spinner>{{ 'nutrition-batch.loading' | translate }}</clr-spinner>
    </div>
  `,
  styles: [`
    .table-actions {
      margin-bottom: 16px;
      display: flex;
      gap: 8px;
    }
    .nutrition-table {
      width: 100%;
    }
    .nutrition-table input,
    .nutrition-table select {
      width: 100%;
    }
    .help-text {
      font-size: 12px;
      color: #666;
      margin-top: 4px;
    }
    .loading-spinner {
      display: flex;
      justify-content: center;
      padding: 40px;
    }
    .text-center {
      text-align: center;
    }
    .text-muted {
      color: #666;
    }
  `]
})
export class NutritionBatchDetailComponent implements OnInit, OnDestroy {
  batchForm: FormGroup;
  batch: NutritionBatchFragment | null = null;
  variantId: string;
  batchId: string;
  isNew = false;
  loading = false;
  saving = false;
  currentLanguage: 'en' | 'fr' | 'ar' = 'en';
  protected destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dataService: DataService,
    private formBuilder: FormBuilder,
    private notificationService: NotificationService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.batchForm = this.formBuilder.group({
      batchCode: ['', Validators.required],
      productionDate: [''],
      expiryDate: [''],
      isCurrentForWebsite: [false],
      servingSizeValue: [0, [Validators.required, Validators.min(0)]],
      servingSizeUnit: ['g', Validators.required],
      servingLabel: [''],
      servingsPerContainer: [null],
      notesInternal: [''],
      ingredientsText: [''],
      allergyAdviceText: [''],
      recommendedUseText: [''],
      storageAdviceText: [''],
      warningsText: [''],
      shortLabelDescription: [''],
      referenceIntakeFootnoteText: [''],
      rows: this.formBuilder.array([])
    });
  }

  get nutritionRows(): FormArray {
    return this.batchForm.get('rows') as FormArray;
  }

  ngOnInit() {
    // Get variantId from parent's parent route (product-variant-detail)
    // Route hierarchy: product-variant/:id/nutrition-batches/:id
    this.variantId = this.route.parent?.parent?.snapshot.params.id;

    // Get batchId from route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params.id === 'create') {
        this.isNew = true;
        this.loading = false;
      } else {
        this.batchId = params.id;
        this.isNew = false;
        this.loadBatch();
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  loadBatch() {
    this.loading = true;
    this.changeDetector.detectChanges();
    
    this.dataService.query(GET_BATCH, { id: this.batchId })
      .mapStream((data: any) => data.nutritionBatch)
      .subscribe({
        next: (batch) => {
          this.batch = batch;
          this.populateForm();
          this.loading = false;
          this.changeDetector.detectChanges();
        },
        error: (error) => {
          this.notificationService.error(error.message);
          this.loading = false;
          this.changeDetector.detectChanges();
        }
      });
  }

  populateForm() {
    if (!this.batch) return;
    
    this.batchForm.patchValue({
      batchCode: this.batch.batchCode,
      productionDate: this.batch.productionDate,
      expiryDate: this.batch.expiryDate,
      isCurrentForWebsite: this.batch.isCurrentForWebsite,
      servingSizeValue: this.batch.servingSizeValue,
      servingSizeUnit: this.batch.servingSizeUnit,
      servingLabel: this.parseLocaleString(this.batch.servingLabel),
      servingsPerContainer: this.batch.servingsPerContainer,
      notesInternal: this.batch.notesInternal,
      ingredientsText: this.parseLocaleString(this.batch.ingredientsText),
      allergyAdviceText: this.parseLocaleString(this.batch.allergyAdviceText),
      recommendedUseText: this.parseLocaleString(this.batch.recommendedUseText),
      storageAdviceText: this.parseLocaleString(this.batch.storageAdviceText),
      warningsText: this.parseLocaleString(this.batch.warningsText),
      shortLabelDescription: this.parseLocaleString(this.batch.shortLabelDescription),
      referenceIntakeFootnoteText: this.parseLocaleString(this.batch.referenceIntakeFootnoteText)
    });

    // Clear existing rows
    while (this.nutritionRows.length) {
      this.nutritionRows.removeAt(0);
    }
    
    // Populate nutrition rows
    this.batch.rows.forEach((row: any) => {
      this.nutritionRows.push(this.createNutritionRowForm(row));
    });
  }

  parseLocaleString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed[this.currentLanguage] || parsed.en || '';
      } catch {
        return value;
      }
    }
    // If already an object
    return value[this.currentLanguage] || value.en || '';
  }

  createNutritionRowForm(row?: any): FormGroup {
    return this.formBuilder.group({
      id: [row?.id || null],
      name: [row ? this.parseLocaleString(row.name) : '', Validators.required],
      group: [row?.group || 'macro', Validators.required],
      unit: [row?.unit || 'g', Validators.required],
      valuePerServing: [row?.valuePerServing || null],
      valuePer100g: [row?.valuePer100g || null],
      referenceIntakePercentPerServing: [row?.referenceIntakePercentPerServing || null],
      displayOrder: [row?.displayOrder || 0]
    });
  }

  addNutritionRow() {
    this.nutritionRows.push(this.createNutritionRowForm());
  }

  removeNutritionRow(index: number) {
    this.nutritionRows.removeAt(index);
  }

  async addDefaultMacros() {
    if (this.isNew) {
      this.notificationService.warning('nutrition-batch.save-before-adding-macros');
      return;
    }

    try {
      await this.dataService.mutate(CREATE_DEFAULT_MACROS, { batchId: this.batchId }).toPromise();
      this.notificationService.success('nutrition-batch.default-macros-added');
      this.loadBatch();
    } catch (error: any) {
      this.notificationService.error(error.message);
    }
  }

  async save() {
    if (this.batchForm.invalid) {
      this.notificationService.error('nutrition-batch.form-invalid');
      return;
    }

    this.saving = true;
    const formValue = this.batchForm.value;

    // Convert locale strings to JSON format
    const input: any = {
      productVariantId: this.variantId, // Required for creation
      batchCode: formValue.batchCode,
      productionDate: formValue.productionDate || null,
      expiryDate: formValue.expiryDate || null,
      isCurrentForWebsite: formValue.isCurrentForWebsite,
      servingSizeValue: parseFloat(formValue.servingSizeValue),
      servingSizeUnit: formValue.servingSizeUnit,
      servingLabel: this.toLocaleString(formValue.servingLabel, 'servingLabel'),
      servingsPerContainer: formValue.servingsPerContainer ? parseInt(formValue.servingsPerContainer) : null,
      notesInternal: formValue.notesInternal || null,
      coaAssetId: null,
      ingredientsText: this.toLocaleString(formValue.ingredientsText, 'ingredientsText'),
      allergyAdviceText: this.toLocaleString(formValue.allergyAdviceText, 'allergyAdviceText'),
      recommendedUseText: this.toLocaleString(formValue.recommendedUseText, 'recommendedUseText'),
      storageAdviceText: this.toLocaleString(formValue.storageAdviceText, 'storageAdviceText'),
      warningsText: this.toLocaleString(formValue.warningsText, 'warningsText'),
      shortLabelDescription: this.toLocaleString(formValue.shortLabelDescription, 'shortLabelDescription'),
      referenceIntakeFootnoteText: this.toLocaleString(formValue.referenceIntakeFootnoteText, 'referenceIntakeFootnoteText')
    };
    
    // Remove productVariantId when updating (only needed for creation)
    if (!this.isNew) {
      delete input.productVariantId;
    }

    try {
      if (this.isNew) {
        const result = await this.dataService.mutate(CREATE_BATCH, {
          input
        }).toPromise();
        this.batchId = (result as any).createNutritionBatch.id;
        this.isNew = false;
        this.notificationService.success('nutrition-batch.batch-created');
        
        // Now save nutrition rows
        await this.saveNutritionRows();
        
        // Navigate back to the list
        this.router.navigate(['../'], { relativeTo: this.route });
      } else {
        await this.dataService.mutate(UPDATE_BATCH, {
          id: this.batchId,
          input
        }).toPromise();
        
        // Save nutrition rows
        await this.saveNutritionRows();
        
        this.notificationService.success('nutrition-batch.batch-updated');
        this.loadBatch();
      }
    } catch (error: any) {
      this.notificationService.error(error.message);
    } finally {
      this.saving = false;
    }
  }

  async saveNutritionRows() {
    const rows = this.nutritionRows.value;
    
    for (const row of rows) {
      const rowInput = {
        name: this.toLocaleStringForRow(row.name, row.id),
        group: row.group,
        unit: row.unit,
        valuePerServing: row.valuePerServing ? parseFloat(row.valuePerServing) : null,
        valuePer100g: row.valuePer100g ? parseFloat(row.valuePer100g) : null,
        referenceIntakePercentPerServing: row.referenceIntakePercentPerServing ? parseFloat(row.referenceIntakePercentPerServing) : null,
        displayOrder: row.displayOrder || 0
      };

      try {
        if (row.id) {
          await this.dataService.mutate(UPDATE_ROW, {
            id: row.id,
            input: rowInput
          }).toPromise();
        } else {
          await this.dataService.mutate(CREATE_ROW, {
            batchId: this.batchId,
            input: rowInput
          }).toPromise();
        }
      } catch (error: any) {
        this.notificationService.error(`Row error: ${error.message}`);
      }
    }
  }

  toLocaleString(value: string, fieldName: string): string {
    // Get existing translations from the batch data
    let translations: Record<string, string> = { en: '', fr: '', ar: '' };
    
    // If editing an existing batch, preserve other language values
    if (this.batch && this.batch[fieldName]) {
      try {
        const existing = typeof this.batch[fieldName] === 'string' 
          ? JSON.parse(this.batch[fieldName])
          : this.batch[fieldName];
        translations = { ...translations, ...existing };
      } catch {
        // Keep defaults
      }
    }
    
    // Update only the current language
    translations[this.currentLanguage] = value || '';
    
    return JSON.stringify(translations);
  }
  
  toLocaleStringForRow(value: string, rowId: string | null): string {
    // Get existing translations for the row
    let translations: Record<string, string> = { en: '', fr: '', ar: '' };
    
    if (rowId && this.batch && this.batch.rows) {
      const existingRow = this.batch.rows.find((r: any) => r.id === rowId);
      if (existingRow && existingRow.name) {
        try {
          const existing = typeof existingRow.name === 'string'
            ? JSON.parse(existingRow.name)
            : existingRow.name;
          translations = { ...translations, ...existing };
        } catch {
          // Keep defaults
        }
      }
    }
    
    // Update only the current language
    translations[this.currentLanguage] = value || '';
    
    return JSON.stringify(translations);
  }

  cancel() {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
