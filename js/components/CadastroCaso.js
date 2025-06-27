// src/components/CadastroCaso.js
import React, { useState } from 'react';

const CadastroCaso = () => {
  const [formData, setFormData] = useState({
    identificador: '',
    nomeCaso: '',
    peritoNome: '',
    statusCaso: 'Em andamento',
    dataPericia: '',
    exameDescricao: '',
    diagnostico: '',
    observacoes: '',
    fotos: [],
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'fotos') {
      setFormData({ ...formData, fotos: Array.from(files).map(f => f.name) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/casos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Caso cadastrado com sucesso!');
        setFormData({
          identificador: '',
          nomeCaso: '',
          peritoNome: '',
          statusCaso: 'Em andamento',
          dataPericia: '',
          exameDescricao: '',
          diagnostico: '',
          observacoes: '',
          fotos: [],
        });
      } else {
        alert('Erro ao cadastrar caso');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro na requisição');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="identificador" value={formData.identificador} onChange={handleChange} placeholder="Identificador" required />
      <input name="nomeCaso" value={formData.nomeCaso} onChange={handleChange} placeholder="Nome do Caso" required />
      <input name="peritoNome" value={formData.peritoNome} onChange={handleChange} placeholder="Nome do Perito" required />
      <select name="statusCaso" value={formData.statusCaso} onChange={handleChange}>
        <option value="Em andamento">Em andamento</option>
        <option value="Finalizado">Finalizado</option>
        <option value="Arquivado">Arquivado</option>
      </select>
      <input name="dataPericia" type="date" value={formData.dataPericia} onChange={handleChange} required />
      <input name="exameDescricao" value={formData.exameDescricao} onChange={handleChange} placeholder="Descrição do Exame" required />
      <input name="diagnostico" value={formData.diagnostico} onChange={handleChange} placeholder="Diagnóstico" required />
      <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} placeholder="Observações" />
      <input name="fotos" type="file" multiple onChange={handleChange} />
      <button type="submit">Salvar Caso</button>
    </form>
  );
};

export default CadastroCaso;
