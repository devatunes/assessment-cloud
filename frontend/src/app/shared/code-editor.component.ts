import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, basicSetup } from 'codemirror';

// Editor de código embebido (CodeMirror 6). El contenido solo se
// reprograma cuando cambia `resetKey` (normalmente el id de la pregunta):
// así el usuario puede escribir sin que cada `codeChange` reinicie el
// cursor, y al cambiar de pregunta el editor sí vuelve a cargar el template.
@Component({
  selector: 'app-code-editor',
  standalone: true,
  template: `<div class="editor-host" #host></div>`,
})
export class CodeEditorComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() initialCode = '';
  @Input() resetKey: string | null = null;
  @Output() codeChange = new EventEmitter<string>();

  @ViewChild('host', { static: true }) host!: ElementRef<HTMLDivElement>;

  private view?: EditorView;
  private lastResetKey: string | null = null;

  ngAfterViewInit(): void {
    this.createEditor(this.initialCode);
    this.lastResetKey = this.resetKey;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.view) return;

    if (changes['resetKey'] && this.resetKey !== this.lastResetKey) {
      this.lastResetKey = this.resetKey;
      this.createEditor(this.initialCode);
    }
  }

  ngOnDestroy(): void {
    this.view?.destroy();
  }

  private createEditor(doc: string): void {
    this.view?.destroy();

    this.view = new EditorView({
      doc,
      extensions: [
        basicSetup,
        javascript(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            this.codeChange.emit(update.state.doc.toString());
          }
        }),
      ],
      parent: this.host.nativeElement,
    });
  }
}
