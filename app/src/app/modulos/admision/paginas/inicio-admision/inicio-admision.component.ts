import { Component, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'aps-inicio-admision',
  imports: [CardModule, RouterLink, ButtonModule],
  templateUrl: './inicio-admision.component.html',
  styleUrl: './inicio-admision.component.scss',
})
export class InicioAdmisionComponent {
  readonly titulo = signal('Admisión');
  readonly areas = signal([
    { nombre: 'Personas', simbolo: '01', descripcion: 'Identidad, identificadores y datos de contacto de las personas.' },
    { nombre: 'Pacientes', simbolo: '02', descripcion: 'Identidad asistencial y número de ficha en el contexto institucional.' },
    { nombre: 'Grupos familiares', simbolo: '03', descripcion: 'Integrantes y parentesco respecto de la persona de referencia.' },
  ]);
}
