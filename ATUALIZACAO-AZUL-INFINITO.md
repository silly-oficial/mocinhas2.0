# Azul infinito — aba experimental

Acesso: botão Azul infinito na tela inicial e em Conta. Ori permanece como tema principal.

36 imagens geradas com fundos azuis, em WebP, com carregamento sob demanda. Galeria vertical circular com três ciclos de altura fixa; recircula a posição sem adicionar elementos indefinidamente. Bordas suaves, fundo azul, linhas de quadra, estrelas e elementos de primeiro plano.

Toque na foto para ver o botão Abrir perfil. Administrador: abra a engrenagem Vincular perfis, selecione os perfis de cada foto e salve. Imagens de grupo aceitam vários perfis. Não foi feita identificação automática de pessoas nem criados perfis fictícios. Sem vínculo, aparece Perfil disponível em breve. Rascunhos não são oferecidos ao visitante.

Pinça amplia a cena entre 100% e 240%, com elementos decorativos em profundidades diferentes. Botões +, − e restaurar oferecem alternativa à pinça. A disposição não muda com o zoom. O perfil abre em página; Voltar restaura a galeria montada na posição anterior. Preferência por movimento reduzido é respeitada.

Vínculos são gravados no banco existente e protegidos por acesso administrativo. Validação rejeita IDs inexistentes e restaura o estado anterior se salvar falhar.

Validação: TypeScript, build de produção, suíte de testes existente e testes de permissões, vínculos múltiplos, rascunhos, dados inválidos e falha de persistência. Sem validação visual ou de pinça em aparelho físico nesta entrega.

ZIP preserva arquivos da versão anterior, acrescentando apenas os recursos desta aba. Sem node_modules, dist ou dados privados de teste.

## Correção de continuidade

As cenas agora se sobrepõem de 42 a 90 pixels, com transparência somente no início da imagem que chega. A imagem anterior permanece opaca sob toda a emenda: não existe mais a dupla transparência que revelava uma faixa azul lisa entre as fotos. A máscara também tem prefixo WebKit para Safari. A continuidade vale entre a última e a primeira foto e nas três cópias do ciclo; os IDs, vínculos e dimensões das fotos permanecem iguais.
